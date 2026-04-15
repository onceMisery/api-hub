package com.apihub.ai.service;

import com.apihub.ai.service.AiFeatureService.ResolvedEndpointContext;

import java.util.List;
import java.util.stream.Collectors;

final class AiPromptTemplates {

    private AiPromptTemplates() {
    }

    static String descriptionSystemPrompt() {
        return """
                你是资深 API 文档架构师。
                任务是基于接口定义生成简体中文接口说明。
                输出要求：
                1. 只输出可直接写入文档的正文，不要加标题前缀，不要输出 Markdown 代码块。
                2. 说明中要覆盖用途、关键参数、响应要点和典型使用场景。
                3. 语言要专业、清晰、偏工程文档风格，避免空泛描述。
                """;
    }

    static String mockSystemPrompt() {
        return """
                你是资深业务架构师和 API Mock 数据专家。
                任务是根据接口响应结构生成真实、合规、可直接返回的 JSON 数据。
                输出要求：
                1. 只输出合法 JSON，不要输出 Markdown，不要输出解释。
                2. 必须严格遵守字段类型。
                3. 字段名和说明中包含 email、phone、name、address、amount、price、status、time、date 等语义时，返回合理业务值。
                4. 若响应字段为空或不完整，仍尽量生成结构合理的最小 JSON。
                """;
    }

    static String codeSystemPrompt() {
        return """
                你是高级 API SDK 工程师。
                任务是根据接口定义生成多语言调用示例。
                输出要求：
                1. 只输出 JSON。
                2. JSON 结构必须是 {"snippets":[{"language":"...","title":"...","code":"..."}]}。
                3. code 字段必须是完整、可读、贴近真实项目实践的示例。
                4. 如果是 curl，优先生成一条可直接执行的命令；如果是 Java / Python / TypeScript，优先生成最常见标准库或主流写法。
                """;
    }

    static String testCaseSystemPrompt() {
        return """
                你是高级测试架构师。
                任务是根据接口定义生成结构化测试用例建议。
                输出要求：
                1. 只输出 JSON。
                2. JSON 结构必须是 {"cases":[{"name":"...","category":"...","purpose":"...","queryString":"...","headers":[{"name":"...","value":"..."}],"body":"...","assertions":[{"type":"...","expression":"...","expectedValue":"..."}],"extractors":[{"variableName":"...","sourceType":"...","expression":"..."}]}]}。
                3. assertions.type 只允许使用 status_equals、status_not_equals、body_contains、body_not_contains、response_time_lte、json_path_equals、json_path_exists、json_path_not_empty。
                4. extractors.sourceType 只允许使用 body_json_path、response_header、response_status。
                5. 输出的 body 字段必须是字符串；没有请求体时可输出空字符串。
                """;
    }

    static String impactSystemPrompt() {
        return """
                你是资深 API 变更评审专家。
                任务是根据接口 Diff 结果判断影响等级、风险点和兼容性建议。
                输出要求：
                1. 只输出 JSON。
                2. JSON 结构必须是 {"level":"high|medium|low","summary":"...","risks":["..."],"recommendations":["..."],"compatibilityAdvice":"..."}。
                3. 必须优先关注路径变更、方法变更、字段删除、必填新增、类型变化等破坏性修改。
                """;
    }

    static String buildDescriptionPrompt(ResolvedEndpointContext context, String instructions) {
        return """
                请为下面接口生成文档说明。

                接口名称：%s
                请求方法：%s
                请求路径：%s
                当前说明：%s

                请求参数：
                %s

                响应结构：
                %s

                额外要求：
                %s
                """.formatted(
                safe(context.name()),
                safe(context.method()),
                safe(context.path()),
                safe(context.description()),
                renderParameters(context),
                renderResponses(context),
                normalizeInstructions(instructions, "如无特别要求，请输出一段结构清晰、便于直接保存的中文说明。"));
    }

    static String buildMockPrompt(ResolvedEndpointContext context, String instructions) {
        return """
                请为下面接口生成一份高保真的 JSON 响应示例。

                接口名称：%s
                请求方法：%s
                请求路径：%s
                接口说明：%s

                响应结构：
                %s

                额外要求：
                %s
                """.formatted(
                safe(context.name()),
                safe(context.method()),
                safe(context.path()),
                safe(context.description()),
                renderResponses(context),
                normalizeInstructions(instructions, "请优先生成贴近真实业务语义的样例数据。"));
    }

    static String buildCodePrompt(ResolvedEndpointContext context,
                                  String baseUrl,
                                  List<String> languages,
                                  String instructions) {
        return """
                请根据下面接口定义生成代码示例。

                接口名称：%s
                请求方法：%s
                请求路径：%s
                Base URL：%s
                接口说明：%s

                请求参数：
                %s

                响应结构：
                %s

                目标语言：
                %s

                额外要求：
                %s
                """.formatted(
                safe(context.name()),
                safe(context.method()),
                safe(context.path()),
                safe(baseUrl),
                safe(context.description()),
                renderParameters(context),
                renderResponses(context),
                languages.stream().collect(Collectors.joining(", ")),
                normalizeInstructions(instructions, "请为每种语言输出一段完整、简洁、可直接参考的示例。"));
    }

    static String buildTestCasePrompt(ResolvedEndpointContext context,
                                      List<String> categories,
                                      String instructions) {
        return """
                请根据下面接口生成测试用例建议。

                接口名称：%s
                请求方法：%s
                请求路径：%s
                接口说明：%s

                请求参数：
                %s

                响应结构：
                %s

                期望覆盖分类：
                %s

                额外要求：
                %s
                """.formatted(
                safe(context.name()),
                safe(context.method()),
                safe(context.path()),
                safe(context.description()),
                renderParameters(context),
                renderResponses(context),
                categories.stream().collect(Collectors.joining(", ")),
                normalizeInstructions(instructions, "至少覆盖正常流程、边界值、非法输入和权限/鉴权场景。"));
    }

    static String buildImpactPrompt(String comparisonJson, String instructions) {
        return """
                请基于下面的接口 Diff 结果生成影响分析。

                Diff JSON：
                %s

                额外要求：
                %s
                """.formatted(
                comparisonJson,
                normalizeInstructions(instructions, "请明确指出是否属于破坏性变更，并给出前后端协同建议。"));
    }

    private static String renderParameters(ResolvedEndpointContext context) {
        if (context.parameters().isEmpty()) {
            return "无";
        }
        return context.parameters().stream()
                .map(item -> "- [%s] %s (%s, %s) 说明=%s 示例=%s".formatted(
                        safe(item.sectionType()),
                        safe(item.name()),
                        safe(item.dataType()),
                        item.required() ? "必填" : "可选",
                        safe(item.description()),
                        safe(item.exampleValue())))
                .collect(Collectors.joining("\n"));
    }

    private static String renderResponses(ResolvedEndpointContext context) {
        if (context.responses().isEmpty()) {
            return "无";
        }
        return context.responses().stream()
                .map(item -> "- [%s %s] %s (%s, %s) 说明=%s 示例=%s".formatted(
                        item.httpStatusCode(),
                        safe(item.mediaType()),
                        safe(item.name()),
                        safe(item.dataType()),
                        item.required() ? "必填" : "可选",
                        safe(item.description()),
                        safe(item.exampleValue())))
                .collect(Collectors.joining("\n"));
    }

    private static String safe(String value) {
        return value == null || value.isBlank() ? "无" : value.trim();
    }

    private static String normalizeInstructions(String instructions, String fallback) {
        return instructions == null || instructions.isBlank() ? fallback : instructions.trim();
    }
}
