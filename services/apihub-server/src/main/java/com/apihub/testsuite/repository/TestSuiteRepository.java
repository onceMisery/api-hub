package com.apihub.testsuite.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.apihub.debug.model.DebugDtos.DebugHeader;
import com.apihub.testsuite.model.TestSuiteDtos.ExecutionReport;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardExecutionItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardOverview;
import com.apihub.testsuite.model.TestSuiteDtos.TestDashboardSuiteHealthItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestAssertionItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteScheduleDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteTriggerSummary;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestExecutionSummary;
import com.apihub.testsuite.model.TestSuiteDtos.TestExtractorItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestStepDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestStepUpsertItem;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteDetail;
import com.apihub.testsuite.model.TestSuiteDtos.TestSuiteSummary;
import com.apihub.testsuite.model.TestSuiteDtos.UpsertTestSuiteRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class TestSuiteRepository {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    private final JdbcTemplate jdbcTemplate;

    public TestSuiteRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<TestSuiteSummary> listSuites(Long projectId) {
        return jdbcTemplate.query(suiteBaseSql() + """
                where suite.project_id = ?
                order by coalesce(last_execution.executed_at, suite.updated_at) desc, suite.id desc
                """, (rs, rowNum) -> new TestSuiteSummary(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getInt("total_steps"),
                rs.getInt("enabled_steps"),
                rs.getString("last_execution_status"),
                rs.getString("last_execution_source"),
                toInstant(rs.getTimestamp("last_executed_at"))), projectId);
    }

    public Optional<TestSuiteDetail> findSuite(Long projectId, Long suiteId) {
        return jdbcTemplate.query(suiteBaseSql() + """
                where suite.project_id = ?
                  and suite.id = ?
                """, (rs, rowNum) -> new TestSuiteDetail(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getInt("total_steps"),
                rs.getInt("enabled_steps"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at")),
                List.of(),
                List.of()), projectId, suiteId).stream().findFirst();
    }

    public Optional<TestSuiteReference> findSuiteReference(Long suiteId) {
        return jdbcTemplate.query("""
                select id, project_id, name
                from test_suite
                where id = ?
                """, (rs, rowNum) -> new TestSuiteReference(
                rs.getLong("id"),
                rs.getLong("project_id"),
                rs.getString("name")), suiteId).stream().findFirst();
    }

    public TestSuiteDetail createSuite(Long userId, Long projectId, UpsertTestSuiteRequest request) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into test_suite (project_id, name, description, created_by)
                    values (?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, projectId);
            statement.setString(2, request.name());
            statement.setString(3, request.description());
            statement.setLong(4, userId);
            return statement;
        }, keyHolder);
        return findSuite(projectId, requireGeneratedId(keyHolder)).orElseThrow();
    }

    public TestSuiteDetail updateSuite(Long projectId, Long suiteId, UpsertTestSuiteRequest request) {
        jdbcTemplate.update("""
                update test_suite
                set name = ?, description = ?
                where id = ?
                """, request.name(), request.description(), suiteId);
        return findSuite(projectId, suiteId).orElseThrow();
    }

    public void deleteSuite(Long suiteId) {
        jdbcTemplate.update("delete from test_suite_trigger where suite_id = ?", suiteId);
        jdbcTemplate.update("delete from test_execution where suite_id = ?", suiteId);
        jdbcTemplate.update("delete from test_step where suite_id = ?", suiteId);
        jdbcTemplate.update("delete from test_suite where id = ?", suiteId);
    }

    public List<TestStepDetail> listSteps(Long suiteId) {
        return jdbcTemplate.query("""
                select step.id,
                       step.endpoint_id,
                       step.environment_id,
                       step.step_order,
                       step.name,
                       step.enabled,
                       endpoint.name as endpoint_name,
                       endpoint.http_method,
                       endpoint.path,
                       environment.name as environment_name,
                       step.query_string,
                       step.request_headers_json,
                       step.request_body,
                       step.pre_script,
                       step.post_script,
                       step.assertions_json,
                       step.extractors_json
                from test_step step
                join api_endpoint endpoint on endpoint.id = step.endpoint_id
                join environment on environment.id = step.environment_id
                where step.suite_id = ?
                order by step.step_order, step.id
                """, (rs, rowNum) -> new TestStepDetail(
                rs.getLong("id"),
                rs.getLong("endpoint_id"),
                rs.getLong("environment_id"),
                rs.getInt("step_order"),
                rs.getString("name"),
                rs.getBoolean("enabled"),
                rs.getString("endpoint_name"),
                rs.getString("http_method"),
                rs.getString("path"),
                rs.getString("environment_name"),
                rs.getString("query_string"),
                deserializeHeaders(rs.getString("request_headers_json")),
                rs.getString("request_body"),
                rs.getString("pre_script"),
                rs.getString("post_script"),
                deserializeAssertions(rs.getString("assertions_json")),
                deserializeExtractors(rs.getString("extractors_json"))), suiteId);
    }

    public void replaceSteps(Long userId, Long suiteId, List<TestStepUpsertItem> steps) {
        jdbcTemplate.update("delete from test_step where suite_id = ?", suiteId);
        for (int index = 0; index < steps.size(); index++) {
            TestStepUpsertItem step = steps.get(index);
            jdbcTemplate.update("""
                    insert into test_step (
                        suite_id,
                        endpoint_id,
                        environment_id,
                        step_order,
                        name,
                        enabled,
                        query_string,
                        request_headers_json,
                        request_body,
                        pre_script,
                        post_script,
                        assertions_json,
                        extractors_json,
                        created_by,
                        updated_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    suiteId,
                    step.endpointId(),
                    step.environmentId(),
                    index,
                    step.name(),
                    Boolean.TRUE.equals(step.enabled()),
                    normalizeNullable(step.queryString()),
                    serializeHeaders(step.headers()),
                    normalizeNullable(step.body()),
                    normalizeNullable(step.preScript()),
                    normalizeNullable(step.postScript()),
                    serializeAssertions(step.assertions()),
                    serializeExtractors(step.extractors()),
                    userId,
                    userId);
        }
    }

    public long createExecution(Long suiteId,
                                String status,
                                String executionSource,
                                Long triggerId,
                                Long scheduleId,
                                int totalSteps,
                                int passedSteps,
                                int failedSteps,
                                long durationMs,
                                ExecutionReport report,
                                Long executedBy) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into test_execution (
                        suite_id,
                        status,
                        execution_source,
                        trigger_id,
                        schedule_id,
                        total_steps,
                        passed_steps,
                        failed_steps,
                        duration_ms,
                        report_json,
                        executed_by
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, suiteId);
            statement.setString(2, status);
            statement.setString(3, executionSource);
            setNullableLong(statement, 4, triggerId);
            setNullableLong(statement, 5, scheduleId);
            statement.setInt(6, totalSteps);
            statement.setInt(7, passedSteps);
            statement.setInt(8, failedSteps);
            statement.setLong(9, durationMs);
            statement.setString(10, serializeExecutionReport(report));
            statement.setLong(11, executedBy);
            return statement;
        }, keyHolder);
        return requireGeneratedId(keyHolder);
    }

    public List<TestExecutionSummary> listExecutionSummaries(Long suiteId, int limit) {
        return jdbcTemplate.query("""
                select id, suite_id, status, execution_source, total_steps, passed_steps, failed_steps, duration_ms, executed_at
                from test_execution
                where suite_id = ?
                order by executed_at desc, id desc
                limit ?
                """, (rs, rowNum) -> new TestExecutionSummary(
                rs.getLong("id"),
                rs.getLong("suite_id"),
                rs.getString("status"),
                rs.getString("execution_source"),
                rs.getInt("total_steps"),
                rs.getInt("passed_steps"),
                rs.getInt("failed_steps"),
                rs.getLong("duration_ms"),
                toInstant(rs.getTimestamp("executed_at"))), suiteId, Math.max(1, limit));
    }

    public List<TestSuiteTriggerSummary> listTriggers(Long suiteId) {
        return jdbcTemplate.query("""
                select trigger_entry.id,
                       trigger_entry.suite_id,
                       trigger_entry.name,
                       trigger_entry.token_prefix,
                       trigger_entry.active,
                       trigger_entry.created_at,
                       trigger_entry.last_triggered_at,
                       trigger_entry.last_execution_id,
                       execution.status as last_execution_status,
                       execution.executed_at as last_executed_at
                from test_suite_trigger trigger_entry
                left join test_execution execution on execution.id = trigger_entry.last_execution_id
                where trigger_entry.suite_id = ?
                order by trigger_entry.created_at desc, trigger_entry.id desc
                """, (rs, rowNum) -> new TestSuiteTriggerSummary(
                rs.getLong("id"),
                rs.getLong("suite_id"),
                rs.getString("name"),
                rs.getString("token_prefix"),
                rs.getBoolean("active"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("last_triggered_at")),
                getNullableLong(rs, "last_execution_id"),
                rs.getString("last_execution_status"),
                toInstant(rs.getTimestamp("last_executed_at"))), suiteId);
    }

    public long createTrigger(Long suiteId, String name, String tokenHash, String tokenPrefix, Long userId) {
        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    insert into test_suite_trigger (suite_id, name, token_hash, token_prefix, created_by)
                    values (?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, suiteId);
            statement.setString(2, name);
            statement.setString(3, tokenHash);
            statement.setString(4, tokenPrefix);
            statement.setLong(5, userId);
            return statement;
        }, keyHolder);
        return requireGeneratedId(keyHolder);
    }

    public Optional<TestSuiteTriggerSummary> findTriggerSummary(Long triggerId) {
        return jdbcTemplate.query("""
                select trigger_entry.id,
                       trigger_entry.suite_id,
                       trigger_entry.name,
                       trigger_entry.token_prefix,
                       trigger_entry.active,
                       trigger_entry.created_at,
                       trigger_entry.last_triggered_at,
                       trigger_entry.last_execution_id,
                       execution.status as last_execution_status,
                       execution.executed_at as last_executed_at
                from test_suite_trigger trigger_entry
                left join test_execution execution on execution.id = trigger_entry.last_execution_id
                where trigger_entry.id = ?
                """, (rs, rowNum) -> new TestSuiteTriggerSummary(
                rs.getLong("id"),
                rs.getLong("suite_id"),
                rs.getString("name"),
                rs.getString("token_prefix"),
                rs.getBoolean("active"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("last_triggered_at")),
                getNullableLong(rs, "last_execution_id"),
                rs.getString("last_execution_status"),
                toInstant(rs.getTimestamp("last_executed_at"))), triggerId).stream().findFirst();
    }

    public void deleteTrigger(Long triggerId) {
        jdbcTemplate.update("delete from test_suite_trigger where id = ?", triggerId);
    }

    public Optional<TriggerReference> findTriggerByTokenHash(String tokenHash) {
        return jdbcTemplate.query("""
                select id, suite_id, created_by, active
                from test_suite_trigger
                where token_hash = ?
                """, (rs, rowNum) -> new TriggerReference(
                rs.getLong("id"),
                rs.getLong("suite_id"),
                rs.getLong("created_by"),
                rs.getBoolean("active")), tokenHash).stream().findFirst();
    }

    public void markTriggerExecuted(Long triggerId, Long executionId) {
        jdbcTemplate.update("""
                update test_suite_trigger
                set last_triggered_at = current_timestamp,
                    last_execution_id = ?
                where id = ?
                """, executionId, triggerId);
    }

    public Optional<TestSuiteScheduleDetail> findSchedule(Long suiteId) {
        return jdbcTemplate.query("""
                select schedule.id,
                       schedule.suite_id,
                       schedule.enabled,
                       schedule.interval_minutes,
                       schedule.next_run_at,
                       schedule.last_run_at,
                       schedule.last_execution_id,
                       execution.status as last_execution_status,
                       execution.executed_at as last_executed_at
                from test_suite_schedule schedule
                left join test_execution execution on execution.id = schedule.last_execution_id
                where schedule.suite_id = ?
                """, (rs, rowNum) -> new TestSuiteScheduleDetail(
                rs.getLong("id"),
                rs.getLong("suite_id"),
                rs.getBoolean("enabled"),
                rs.getInt("interval_minutes"),
                toInstant(rs.getTimestamp("next_run_at")),
                toInstant(rs.getTimestamp("last_run_at")),
                getNullableLong(rs, "last_execution_id"),
                rs.getString("last_execution_status"),
                toInstant(rs.getTimestamp("last_executed_at"))), suiteId).stream().findFirst();
    }

    public TestSuiteScheduleDetail saveSchedule(Long suiteId,
                                                boolean enabled,
                                                int intervalMinutes,
                                                Instant nextRunAt,
                                                Long userId) {
        Optional<Long> existingId = findScheduleId(suiteId);
        if (existingId.isPresent()) {
            jdbcTemplate.update("""
                    update test_suite_schedule
                    set enabled = ?,
                        interval_minutes = ?,
                        next_run_at = ?,
                        updated_by = ?,
                        updated_at = current_timestamp
                    where suite_id = ?
                    """,
                    enabled,
                    intervalMinutes,
                    toTimestamp(nextRunAt),
                    userId,
                    suiteId);
        } else {
            jdbcTemplate.update("""
                    insert into test_suite_schedule (
                        suite_id,
                        enabled,
                        interval_minutes,
                        next_run_at,
                        created_by,
                        updated_by
                    )
                    values (?, ?, ?, ?, ?, ?)
                    """,
                    suiteId,
                    enabled,
                    intervalMinutes,
                    toTimestamp(nextRunAt),
                    userId,
                    userId);
        }
        return findSchedule(suiteId).orElseThrow();
    }

    public List<DueScheduleReference> listDueSchedules(Instant dueBefore, int limit) {
        return jdbcTemplate.query("""
                select schedule.id,
                       schedule.suite_id,
                       suite.project_id,
                       schedule.interval_minutes,
                       schedule.next_run_at,
                       schedule.created_by
                from test_suite_schedule schedule
                join test_suite suite on suite.id = schedule.suite_id
                where schedule.enabled = true
                  and schedule.next_run_at is not null
                  and schedule.next_run_at <= ?
                order by schedule.next_run_at asc, schedule.id asc
                limit ?
                """, (rs, rowNum) -> new DueScheduleReference(
                rs.getLong("id"),
                rs.getLong("suite_id"),
                rs.getLong("project_id"),
                rs.getInt("interval_minutes"),
                toInstant(rs.getTimestamp("next_run_at")),
                rs.getLong("created_by")),
                toTimestamp(dueBefore),
                Math.max(1, limit));
    }

    public boolean claimDueSchedule(Long scheduleId,
                                    Instant expectedNextRunAt,
                                    Instant lastRunAt,
                                    Instant nextRunAt,
                                    Long updatedBy) {
        return jdbcTemplate.update("""
                update test_suite_schedule
                set last_run_at = ?,
                    next_run_at = ?,
                    updated_by = ?,
                    updated_at = current_timestamp
                where id = ?
                  and enabled = true
                  and next_run_at = ?
                """,
                toTimestamp(lastRunAt),
                toTimestamp(nextRunAt),
                updatedBy,
                scheduleId,
                toTimestamp(expectedNextRunAt)) > 0;
    }

    public void markScheduleExecution(Long scheduleId, Long executionId, Long updatedBy) {
        jdbcTemplate.update("""
                update test_suite_schedule
                set last_execution_id = ?,
                    updated_by = ?,
                    updated_at = current_timestamp
                where id = ?
                """, executionId, updatedBy, scheduleId);
    }

    public TestDashboardOverview getDashboardOverview(Long projectId) {
        return jdbcTemplate.queryForObject("""
                select count(distinct suite.id) as total_suites,
                       coalesce(sum(case when coalesce(step_stats.enabled_steps, 0) > 0 then 1 else 0 end), 0) as active_suites,
                       coalesce(count(execution.id), 0) as total_executions,
                       coalesce(sum(case when execution.status = 'passed' then 1 else 0 end), 0) as passed_executions,
                       coalesce(sum(case when execution.status = 'failed' then 1 else 0 end), 0) as failed_executions,
                       coalesce(sum(case when execution.status = 'error' then 1 else 0 end), 0) as error_executions,
                       coalesce(avg(execution.duration_ms), 0) as average_duration_ms
                from test_suite suite
                left join (
                    select suite_id,
                           sum(case when enabled then 1 else 0 end) as enabled_steps
                    from test_step
                    group by suite_id
                ) step_stats on step_stats.suite_id = suite.id
                left join test_execution execution on execution.suite_id = suite.id
                where suite.project_id = ?
                """, (rs, rowNum) -> new TestDashboardOverview(
                rs.getInt("total_suites"),
                rs.getInt("active_suites"),
                rs.getInt("total_executions"),
                rs.getInt("passed_executions"),
                rs.getInt("failed_executions"),
                rs.getInt("error_executions"),
                rs.getLong("average_duration_ms"),
                0.0), projectId);
    }

    public List<TestDashboardExecutionItem> listProjectExecutions(Long projectId, int limit) {
        return jdbcTemplate.query("""
                select execution.id as execution_id,
                       execution.suite_id,
                       suite.name as suite_name,
                       execution.status,
                       execution.execution_source,
                       execution.total_steps,
                       execution.passed_steps,
                       execution.failed_steps,
                       execution.duration_ms,
                       execution.executed_at
                from test_execution execution
                join test_suite suite on suite.id = execution.suite_id
                where suite.project_id = ?
                order by execution.executed_at desc, execution.id desc
                limit ?
                """, (rs, rowNum) -> new TestDashboardExecutionItem(
                rs.getLong("execution_id"),
                rs.getLong("suite_id"),
                rs.getString("suite_name"),
                rs.getString("status"),
                rs.getString("execution_source"),
                rs.getInt("total_steps"),
                rs.getInt("passed_steps"),
                rs.getInt("failed_steps"),
                rs.getLong("duration_ms"),
                toInstant(rs.getTimestamp("executed_at"))), projectId, Math.max(1, limit));
    }

    public List<TestDashboardSuiteHealthItem> listSuiteHealth(Long projectId, int limit) {
        return jdbcTemplate.query("""
                select suite.id as suite_id,
                       suite.name as suite_name,
                       coalesce(step_stats.total_steps, 0) as total_steps,
                       coalesce(step_stats.enabled_steps, 0) as enabled_steps,
                       last_execution.status as last_execution_status,
                       last_execution.executed_at as last_executed_at,
                       coalesce(execution_stats.total_runs, 0) as total_runs,
                       coalesce(execution_stats.average_duration_ms, 0) as average_duration_ms,
                       case
                           when coalesce(execution_stats.total_runs, 0) = 0 then 0
                           else round((execution_stats.passed_runs * 100.0) / execution_stats.total_runs, 1)
                       end as pass_rate
                from test_suite suite
                left join (
                    select suite_id,
                           count(*) as total_steps,
                           sum(case when enabled then 1 else 0 end) as enabled_steps
                    from test_step
                    group by suite_id
                ) step_stats on step_stats.suite_id = suite.id
                left join (
                    select suite_id,
                           count(*) as total_runs,
                           sum(case when status = 'passed' then 1 else 0 end) as passed_runs,
                           avg(duration_ms) as average_duration_ms
                    from test_execution
                    group by suite_id
                ) execution_stats on execution_stats.suite_id = suite.id
                left join test_execution last_execution
                  on last_execution.id = (
                        select execution.id
                        from test_execution execution
                        where execution.suite_id = suite.id
                        order by execution.executed_at desc, execution.id desc
                        limit 1
                  )
                where suite.project_id = ?
                order by coalesce(last_execution.executed_at, suite.updated_at) desc, suite.id desc
                limit ?
                """, (rs, rowNum) -> new TestDashboardSuiteHealthItem(
                rs.getLong("suite_id"),
                rs.getString("suite_name"),
                rs.getInt("total_steps"),
                rs.getInt("enabled_steps"),
                rs.getString("last_execution_status"),
                toInstant(rs.getTimestamp("last_executed_at")),
                rs.getInt("total_runs"),
                rs.getDouble("pass_rate"),
                rs.getLong("average_duration_ms")), projectId, Math.max(1, limit));
    }

    public Optional<TestExecutionDetail> findExecution(Long projectId, Long executionId) {
        return jdbcTemplate.query("""
                select execution.id,
                       execution.suite_id,
                       suite.name as suite_name,
                       execution.status,
                       execution.execution_source,
                       execution.total_steps,
                       execution.passed_steps,
                       execution.failed_steps,
                       execution.duration_ms,
                       execution.report_json,
                       execution.executed_at
                from test_execution execution
                join test_suite suite on suite.id = execution.suite_id
                where suite.project_id = ?
                  and execution.id = ?
                """, (rs, rowNum) -> {
            ExecutionReport report = deserializeExecutionReport(rs.getString("report_json"));
            return new TestExecutionDetail(
                    rs.getLong("id"),
                    rs.getLong("suite_id"),
                    rs.getString("suite_name"),
                    rs.getString("status"),
                    rs.getString("execution_source"),
                    rs.getInt("total_steps"),
                    rs.getInt("passed_steps"),
                    rs.getInt("failed_steps"),
                    rs.getLong("duration_ms"),
                    toInstant(rs.getTimestamp("executed_at")),
                    report.steps());
        }, projectId, executionId).stream().findFirst();
    }

    private String suiteBaseSql() {
        return """
                select suite.id,
                       suite.project_id,
                       suite.name,
                       suite.description,
                       suite.created_at,
                       suite.updated_at,
                       coalesce(step_stats.total_steps, 0) as total_steps,
                       coalesce(step_stats.enabled_steps, 0) as enabled_steps,
                       last_execution.status as last_execution_status,
                       last_execution.execution_source as last_execution_source,
                       last_execution.executed_at as last_executed_at
                from test_suite suite
                left join (
                    select suite_id,
                           count(*) as total_steps,
                           sum(case when enabled then 1 else 0 end) as enabled_steps
                    from test_step
                    group by suite_id
                ) step_stats on step_stats.suite_id = suite.id
                left join test_execution last_execution
                  on last_execution.id = (
                        select execution.id
                        from test_execution execution
                        where execution.suite_id = suite.id
                        order by execution.executed_at desc, execution.id desc
                        limit 1
                  )
                """;
    }

    private long requireGeneratedId(GeneratedKeyHolder keyHolder) {
        if (keyHolder.getKeys() != null) {
            for (Object value : keyHolder.getKeys().values()) {
                if (value instanceof Number number) {
                    return number.longValue();
                }
            }
        }
        Number key = keyHolder.getKey();
        if (key != null) {
            return key.longValue();
        }
        throw new IllegalStateException("Failed to generate primary key");
    }

    private static Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static Long getNullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static String normalizeNullable(String value) {
        return value == null ? "" : value;
    }

    private Optional<Long> findScheduleId(Long suiteId) {
        return jdbcTemplate.query("""
                select id
                from test_suite_schedule
                where suite_id = ?
                """, (rs, rowNum) -> rs.getLong("id"), suiteId).stream().findFirst();
    }

    private static Timestamp toTimestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private static void setNullableLong(PreparedStatement statement, int parameterIndex, Long value) throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(parameterIndex, java.sql.Types.BIGINT);
            return;
        }
        statement.setLong(parameterIndex, value);
    }

    private String serializeHeaders(List<DebugHeader> headers) {
        try {
            return OBJECT_MAPPER.writeValueAsString(headers == null ? List.of() : headers);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize test step headers", exception);
        }
    }

    private static List<DebugHeader> deserializeHeaders(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<DebugHeader>>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse test step headers", exception);
        }
    }

    private String serializeAssertions(List<TestAssertionItem> assertions) {
        try {
            return OBJECT_MAPPER.writeValueAsString(assertions == null ? List.of() : assertions);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize test assertions", exception);
        }
    }

    private static List<TestAssertionItem> deserializeAssertions(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<TestAssertionItem>>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse test assertions", exception);
        }
    }

    private String serializeExtractors(List<TestExtractorItem> extractors) {
        try {
            return OBJECT_MAPPER.writeValueAsString(extractors == null ? List.of() : extractors);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize test extractors", exception);
        }
    }

    private static List<TestExtractorItem> deserializeExtractors(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<TestExtractorItem>>() {
            });
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse test extractors", exception);
        }
    }

    private String serializeExecutionReport(ExecutionReport report) {
        try {
            return OBJECT_MAPPER.writeValueAsString(report == null ? new ExecutionReport(List.of()) : report);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize execution report", exception);
        }
    }

    private static ExecutionReport deserializeExecutionReport(String json) {
        if (json == null || json.isBlank()) {
            return new ExecutionReport(List.of());
        }
        try {
            return OBJECT_MAPPER.readValue(json, ExecutionReport.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to parse execution report", exception);
        }
    }

    public record TestSuiteReference(Long id, Long projectId, String name) {
    }

    public record TriggerReference(Long id, Long suiteId, Long createdBy, boolean active) {
    }

    public record DueScheduleReference(Long id,
                                       Long suiteId,
                                       Long projectId,
                                       int intervalMinutes,
                                       Instant nextRunAt,
                                       Long createdBy) {
    }
}
