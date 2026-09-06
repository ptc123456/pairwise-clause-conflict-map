import json


ONE = {"clauses": [{"id": "a", "text": "Do A"}], "scenarios": [{"id": "s", "text": "Always"}], "precedence": []}
TWO = {"clauses": [{"id": "a", "text": "Do A"}, {"id": "b", "text": "Do not A"}], "scenarios": [{"id": "s", "text": "Always"}], "precedence": []}
ORDERED = {**TWO, "precedence": [{"higher": "a", "lower": "b"}]}


def encoded(value):
    return json.dumps(value, separators=(",", ":"), sort_keys=True)


def deploy(direct_deploy):
    return direct_deploy("contracts/main.py")


def record(contract, case_id=1):
    return json.loads(contract.get_case(case_id))


def test_create_replay_edit_freeze_and_one_clause_short_circuit(direct_deploy):
    contract = deploy(direct_deploy)
    nonce = "0" * 32
    assert contract.create_bundle(nonce, encoded(ONE), 0) == 1
    assert contract.create_bundle(nonce, encoded(ONE), 0) == 1
    assert contract.get_count() == 1
    contract.replace_bundle(1, encoded(ONE), 1)
    contract.freeze_bundle(1, 2)
    contract.analyze_conflicts(1, 3)
    current = record(contract)
    assert current["phase"] == "DONE"
    assert current["outcome"] == "NO_PAIRS_TO_COMPARE"
    assert current["revision"] == "4"
    assert json.loads(contract.get_version(1, 4))["last_operation"]["method"] == "analyze_conflicts"


def test_cycle_and_duplicate_keys_reject_without_mutation(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    cycle = {**TWO, "precedence": [{"higher": "a", "lower": "b"}, {"higher": "b", "lower": "a"}]}
    with direct_vm.expect_revert("PRECEDENCE_CYCLE"):
        contract.create_bundle("1" * 32, encoded(cycle), 0)
    with direct_vm.expect_revert("BAD_JSON"):
        contract.create_bundle("1" * 32, '{"clauses":[],"clauses":[],"scenarios":[],"precedence":[]}', 0)
    assert contract.get_count() == 0


def test_unordered_and_ordered_clashes(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    direct_vm.mock_llm("BEGIN_UNTRUSTED_JSON", '{"v":1,"labels":["CLASH"]}')
    contract.create_bundle("2" * 32, encoded(TWO), 0)
    contract.freeze_bundle(1, 1)
    contract.analyze_conflicts(1, 2)
    assert record(contract)["outcome"] == "UNORDERED_PAIRWISE_CLASHES"


def test_precedence_orders_clash_and_validator_rederives(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    direct_vm.mock_llm("BEGIN_UNTRUSTED_JSON", '{"v":1,"labels":["CLASH"]}')
    contract.create_bundle("3" * 32, encoded(ORDERED), 0)
    contract.freeze_bundle(1, 1)
    contract.analyze_conflicts(1, 2)
    assert record(contract)["outcome"] == "ALL_PAIRWISE_CLASHES_ORDERED"
    assert direct_vm.run_validator()
    direct_vm.clear_mocks()
    direct_vm.mock_llm("BEGIN_UNTRUSTED_JSON", '{"v":1,"labels":["OK"]}')
    assert not direct_vm.run_validator()


def test_unknown_is_retryable_and_cooldown_is_transaction_time(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    direct_vm.mock_llm("BEGIN_UNTRUSTED_JSON", '{"v":1,"labels":["UNKNOWN"]}')
    contract.create_bundle("4" * 32, encoded(TWO), 0)
    contract.freeze_bundle(1, 1)
    contract.analyze_conflicts(1, 2)
    current = record(contract)
    assert current["phase"] == "UNRESOLVED"
    assert current["outcome"] == "UNRESOLVED"
    with direct_vm.expect_revert("COOLDOWN"):
        contract.retry_bundle(1, 3)
    direct_vm.warp("2030-01-01T00:02:00Z")
    contract.retry_bundle(1, 3)
    assert record(contract)["accepted_attempts"] == 2


def test_third_unknown_exhausts_but_preserves_semantic_outcome(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    direct_vm.mock_llm("BEGIN_UNTRUSTED_JSON", '{"v":1,"labels":["UNKNOWN"]}')
    contract.create_bundle("6" * 32, encoded(TWO), 0)
    contract.freeze_bundle(1, 1)
    contract.analyze_conflicts(1, 2)
    direct_vm.warp("2030-01-01T00:02:00Z")
    contract.retry_bundle(1, 3)
    direct_vm.warp("2030-01-01T00:03:00Z")
    contract.retry_bundle(1, 4)
    current = record(contract)
    assert current["phase"] == "EXHAUSTED"
    assert current["outcome"] == "UNRESOLVED"
    assert current["accepted_attempts"] == 3


def test_maximum_264_cells_and_prompt_order(direct_vm, direct_deploy):
    clauses = [{"id": f"c{i}", "text": f"Clause {i}"} for i in range(12)]
    scenarios = [{"id": f"s{i}", "text": f"Scenario {i}"} for i in range(4)]
    maximum = {"clauses": clauses, "scenarios": scenarios, "precedence": []}
    direct_vm.mock_llm("lexicographic index order i<j", encoded({"v": 1, "labels": ["OK"] * 264}))
    contract = deploy(direct_deploy)
    contract.create_bundle("7" * 32, encoded(maximum), 0)
    contract.freeze_bundle(1, 1)
    contract.analyze_conflicts(1, 2)
    current = record(contract)
    assert len(current["result"]["labels"]) == 264
    assert current["outcome"] == "NO_PAIRWISE_CLASH_DETECTED"
    for changed in range(264):
        labels = ["OK"] * 264
        labels[changed] = "CLASH"
        assert not direct_vm.run_validator(leader_result={"v": 1, "labels": labels})


def test_malformed_or_oversized_model_output_never_mutates(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    contract.create_bundle("8" * 32, encoded(TWO), 0)
    contract.freeze_bundle(1, 1)
    before = contract.get_case(1)
    direct_vm.mock_llm("BEGIN_UNTRUSTED_JSON", '{"v":1,"labels":[]}')
    with direct_vm.expect_revert("BAD_RESULT"):
        contract.analyze_conflicts(1, 2)
    assert contract.get_case(1) == before
    direct_vm.clear_mocks()
    direct_vm.mock_llm("BEGIN_UNTRUSTED_JSON", "x" * 4097)
    with direct_vm.expect_revert("CAPACITY"):
        contract.analyze_conflicts(1, 2)
    assert contract.get_case(1) == before


def test_nonce_conflict_parent_children_and_pagination(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    nonce = "9" * 32
    contract.create_bundle(nonce, encoded(ONE), 0)
    with direct_vm.expect_revert("NONCE_CONFLICT"):
        contract.create_bundle(nonce, encoded(TWO), 0)
    contract.freeze_bundle(1, 1)
    contract.analyze_conflicts(1, 2)
    contract.create_bundle("a" * 32, encoded(ONE), 1)
    assert json.loads(contract.list_children(1, 0, 4)) == {"ids": ["2"], "next": "0"}
    assert json.loads(contract.list_cases(1, 1)) == {"ids": ["1"], "next": "2"}
    assert json.loads(contract.list_cases(2, 4)) == {"ids": ["2"], "next": "0"}


def test_case_capacity_32_33(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    for index in range(32):
        assert contract.create_bundle(f"{index:032x}", encoded(ONE), 0) == index + 1
    before = contract.get_count()
    with direct_vm.expect_revert("CAPACITY"):
        contract.create_bundle("f" * 32, encoded(ONE), 0)
    assert contract.get_count() == before == 32


def test_draft_edit_reserves_completion_revisions(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    contract.create_bundle("b" * 32, encoded(ONE), 0)
    for expected_revision in range(1, 28):
        contract.replace_bundle(1, encoded(ONE), expected_revision)
    before = contract.get_case(1)
    with direct_vm.expect_revert("CAPACITY"):
        contract.replace_bundle(1, encoded(ONE), 28)
    assert contract.get_case(1) == before
    contract.freeze_bundle(1, 28)
    contract.analyze_conflicts(1, 29)
    assert record(contract)["revision"] == "30"


def test_stale_revision_and_wrong_actor_leave_state_unchanged(direct_vm, direct_deploy, direct_bob):
    contract = deploy(direct_deploy)
    contract.create_bundle("5" * 32, encoded(ONE), 0)
    before = contract.get_case(1)
    with direct_vm.expect_revert("STALE_REVISION"):
        contract.freeze_bundle(1, 2)
    assert contract.get_case(1) == before
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("UNAUTHORIZED"):
            contract.freeze_bundle(1, 1)
    assert contract.get_case(1) == before
