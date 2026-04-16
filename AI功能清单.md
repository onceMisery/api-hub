
### 一、 核心 AI 功能拆解与交互设计
> 注意： 所有引入其他中间件的(如Redis、miniIO)等，都只能是可选项

#### 1. 📝 AI 生成接口描述 (AI API Description)
* **触发时机**：在“管理模式”新建或编辑接口时，用户点击描述文本框旁的“✨ 智能补全”按钮。
* **上下文输入 (Context)**：当前接口的 HTTP Method、URL 路径（如 `/api/v1/trade/rebate/calculate`）、已录入的请求参数列表及类型。
* **输出期望**：生成一段结构化的自然语言描述与业务使用说明。
* **UI 交互**：流式输出（Streaming）到富文本编辑器中，用户可随时中断，并在生成后进行二次润色。

#### 2. 🎭 AI 智能 Mock 数据 (Smart Mock Generation)
* **触发时机**：在“Mock 配置”面板，当开发者不想手动编写 Mock.js 规则，点击“🤖 AI 智能生成”时。
* **上下文输入 (Context)**：完整的响应结构定义（Response Schema）、字段名、字段类型以及字段描述。
* **输出期望**：LLM 需返回一段纯 JSON 格式的数据。要求具备极强的业务语义，例如字段名为 `email` 时返回合法的邮箱格式，字段涉及供应链折扣时返回合理的数值比例。
* **UI 交互**：生成的 JSON 代码直接填充至 Monaco Editor 中，并高亮显示供开发者 review。

#### 3. 🧪 AI 生成测试用例 (AI Test Case Suggestion)
* **触发时机**：在“测试用例 (Test Suite)” Tab 页，点击“生成推荐用例”。
* **上下文输入 (Context)**：完整的 API 定义，包括必填/非必填项、参数边界（如 max_length）、数据字典枚举映射。
* **输出期望**：返回一个结构化的 JSON 数组，包含不同维度的测试用例（正向正常流程、边界值异常、非法参数拦截、权限越权测试）以及预期断言（Assertions）建议。
* **UI 交互**：前端解析生成的 JSON 数组，以卡片或列表形式展示。用户可勾选需要的用例，一键导入到自动化测试编排链条中。

#### 4. 📊 AI 变更影响分析 (Change Impact Analysis)
* **触发时机**：在“版本历史”查看 Diff 对比结果时，或者在 DocForge 引擎增量推送触发 Webhook 告警时自动执行。
* **上下文输入 (Context)**：Diff 引擎计算出的变更明细（如新增参数、字段改名、URL 变动）。
* **输出期望**：评估本次变更是 Breaking（破坏性）还是 Non-Breaking（兼容），并输出具体的影响范围分析（如“前端调用需修改由于字段 msg 改名为 message”）和兼容性建议。
* **UI 交互**：在 Diff 对比视图上方显示一个“AI 诊断报告”的折叠面板，高危变更使用红色警示。

#### 5. 💬 AI 文档问答 - RAG (Ask your API)
* **触发时机**：全局导航栏的智能搜索框，或独立悬浮的“API 助手”对话框。
* **上下文输入 (Context)**：用户的自然语言提问（例如：“如何获取订单的返利金额？”）。
* **输出期望**：基于项目 API 文档库的精准回答，并附带相关接口的直接跳转链接。
* **底层机制**：采用检索增强生成（RAG）架构。当 DocForge 推送接口时，后端将文档切块并向量化，存储到向量数据库中。提问时先检索最相关的 API 文档片段，再将其作为 Context 喂给大模型。
* **作用范围**：RAG搜索的应该当前分组下的内容

#### 6. 💻 AI 代码示例生成 (Code Snippet Generation)
* **触发时机**：在“浏览模式”阅读接口文档时，代码示例区域的下拉菜单切换语言时自动触发。
* **上下文输入 (Context)**：接口的完整定义、Mock 的请求示例、目标编程语言（如 Java, Python, TypeScript, cURL）。
* **输出期望**：符合目标语言最佳实践的 HTTP 调用代码片段（如 Java 常用 HttpClient 或 OkHttp 构建）。

---

### 二、 底层技术架构落地建议

 引入统一的 AI 抽象层：
* **模型抽象层**：采用 **Spring AI (推荐 1.1.2 版本)** 作为统一的底层框架。它能完美屏蔽不同大模型（如 OpenAI、通义千问、Ollama）的 API 差异，并原生内置了强大的 Prompt Template 管理和结构化输出解析器（Structured Output Converters）。
* **代理与网络配置**：考虑到开发环境的网络连通性，Spring AI 配置中需支持灵活的 API 代理（Proxy）设置，以便顺畅对接不同供应商的模型服务（如配置代理以访问 GPT-4o 或 Claude 的端点）。
* **RAG 向量检索**：针对“AI 文档问答”功能，可以集成轻量级且高性能的向量数据库（如 **JVector**），在内存中快速完成接口文档切块的 Embedding 存储与余弦相似度检索，极大提升问答响应速度。


---

## AI 智能 Mock 数据生成

可以采用 **System Prompt（人设与规则） + User Prompt（动态上下文）** 的双层结构来进行设计。

### 一、 Prompt 结构设计

#### 1. System Prompt 

这部分在系统中是静态的，主要用于约束模型的输出边界和数据风格。

> 你是一个资深的业务架构师与 API Mock 数据专家。你的任务是根据给定的接口响应定义，生成具有极高真实度和业务语义的 Mock 数据。
>
> **【核心规则】**
> 1. **纯净输出**：只能输出合法的纯 JSON 字符串，**绝对不要**包含任何 Markdown 格式（如 ````json````）、说明性文字或多余的换行。
> 2. **类型严谨**：严格遵守给定的数据类型，数字不能带引号，布尔值必须是 true/false。
> 3. **业务常识推导**：仔细阅读字段名和接口描述。
     >    - 如果是时间字段（带有 date/time/at 等后缀），生成最近一周内的合理时间戳或 ISO-8601 字符串。
>    - 如果涉及财务与供应链逻辑（如返利、折扣、金额），请生成符合现实逻辑的数据（例如：金额不要过大，折扣率通常在 0.1 到 0.99 之间，常见税率如 0.13、0.09、0.06）。
>    - 如果涉及系统集成（如 ERP/金蝶对接的单据号），请生成符合特定规则的编号（如 `SAL-20260415-001`）。

#### 2. User Prompt (用户提示词：注入动态上下文)

这部分是由 ApiHub 后端在用户点击“生成”时，动态从数据库中组装并注入的模板。

> **接口路径**：`{method} {url}`
> **接口描述**：`{description}`
> **请求参数示例（参考）**：`{requestExample}`
>
> **期望的响应结构定义（Response Schema）**：
> ```json
> {responseSchema}
> ```
>
> 请基于以上信息，生成对应的 JSON 数据。

---

### 二、 实战案例模拟

假设我们正在为一个真实的业务系统生成 Mock 数据，接口是关于**经销商返利计算**的。ApiHub 会将结构组装成如下内容发送给 LLM：

**组装后的最终 Prompt：**

> **接口路径**：`POST /api/v1/finance/rebates/calculate`
> **接口描述**：根据经销商近期的采购流水，结合当前的返利政策，计算应发放的返利总额，并匹配对应的金蝶税率。
> **请求参数示例（参考）**：`{"dealerId": "DL-9901", "period": "2026-Q1"}`
>
> **期望的响应结构定义（Response Schema）**：
> ```json
> [
>   {"name": "code", "type": "int", "description": "业务状态码，0为成功"},
>   {"name": "data", "type": "object", "description": "返利详情", "children": [
>     {"name": "dealerName", "type": "string", "description": "经销商名称"},
>     {"name": "totalSales", "type": "number", "description": "本期累计销售额"},
>     {"name": "rebateAmount", "type": "number", "description": "核算返利金额"},
>     {"name": "taxRate", "type": "number", "description": "系统匹配税率"},
>     {"name": "documentNo", "type": "string", "description": "预生成的财务单据号"}
>   ]}
> ]
> ```
> 请基于以上信息，生成对应的 JSON 数据。

**大模型返回的高保真结果：**

```json
{
  "code": 0,
  "data": {
    "dealerName": "华南区核心代理商-创源科技",
    "totalSales": 1500000.00,
    "rebateAmount": 45000.00,
    "taxRate": 0.13,
    "documentNo": "REB-20260415-001"
  }
}
```

---

### 三、 工程落地的关键点

在 Java 后端落地时，为了彻底杜绝 LLM 偶尔发疯返回非 JSON 内容，可以通过编程框架强制约束模型输出。

利用 Spring AI 1.1.2 提供的结构化输出能力（Structured Output），我们可以这样写：

```java
// 1. 定义期望返回的 Java Record 类
record MockResponseData(Integer code, Object data) {}

// 2. 使用 BeanOutputConverter 强制约束
BeanOutputConverter<MockResponseData> converter = new BeanOutputConverter<>(MockResponseData.class);

// 3. 将转换器的格式要求追加到 Prompt 中
String formatInstructions = converter.getFormat();
String finalPrompt = basePrompt + "\n" + formatInstructions;

// 4. 调用模型并解析结果
String responseContent = chatClient.prompt(new Prompt(finalPrompt)).call().content();
MockResponseData mockData = converter.convert(responseContent);
```

配合你在本地开发时配置的 API 代理工具链（如 OpenAI 代理端点），这样的结构能保证极高的生成成功率和业务契合度。

## “AI 文档问答 (RAG)”能力
传统的长文本切块（Chunking）策略（如按字数或段落盲切）在 API 文档场景下往往是灾难性的，因为它们会破坏 JSON 结构、切断参数与描述的关联。
结合纯 Java 生态的高性能向量库 JVector，以及功能完善的 Spring AI 1.1.2 框架，我们可以设计一套专门针对 API 文档的 RAG 落地架构。

以下是完整的切块、存储与检索策略设计：

### 一、 核心挑战：API 文档的语义化切块 (Chunking Strategy)

API 文档具有极强的结构化特征，我们不能使用传统的 `TokenTextSplitter`。最佳策略是**以“单个接口 (Endpoint)”为最小原子单位进行切块**，并辅以数据字典和全局说明作为独立块。

#### 1. 结构化降维拼接 (Flattening)
大模型对嵌套过深的 JSON 理解能力有限，我们需要在存入向量库前，将接口定义的树形表格“降维”拼接成自然语言风格的 Markdown 文本。

**切块模板 (Chunk Template)：**
```markdown
【接口名称】获取用户信息
【接口路径】GET /api/v1/users/info
【所属模块】用户管理
【功能描述】获取当前系统中的用户详细信息，支持通过 include 参数进行关联查询。

【请求参数】
- userId (string, 必填): 用户的唯一标识符
- include (array, 选填): 包含的附加信息，允许的值为: roles(角色), departments(部门)

【响应结构】
- code (int): 业务状态码 (0为成功)
- data.name (string): 用户昵称
```
*注：每一个这样的文本块，对应 JVector 中的一条记录。*

#### 2. 元数据隔离 (Metadata Design)
为了防止大模型在回答时把项目 A 的接口和项目 B 的接口搞混，必须利用 Spring AI 的 Metadata 进行硬性过滤（Filter Search）。

* `projectId`: 用于租户/项目数据隔离（关键）。
* `moduleId`: 用于缩小检索范围。
* `endpointId`: 用于在前端回答时，提供高亮的接口跳转链接。

---

 

### 三、 核心代码落地 (基于 Spring Boot + Spring AI 1.1.2)

利用 Spring AI 提供的 `VectorStore` 抽象接口，我们可以非常优雅地完成文档的向量化与检索。

#### 1. 文档入库 (Indexing)

当 DocForge 推送接口变更后，触发向量更新：

```java
@Service
public class ApiDocumentIndexer {

    private final VectorStore vectorStore; // 注入 JVector 实现的 VectorStore
    private final EmbeddingModel embeddingModel;

    /**
     * 将接口转化为向量文档存入 JVector
     */
    public void indexEndpoint(ApiEndpoint endpoint) {
        // 1. 组装符合人类直觉的 Markdown 文本
        String documentContent = buildMarkdownContent(endpoint);

        // 2. 组装元数据用于精准过滤
        Map<String, Object> metadata = Map.of(
            "projectId", endpoint.getProjectId(),
            "moduleId", endpoint.getModuleId(),
            "endpointId", endpoint.getId(),
            "method", endpoint.getHttpMethod(),
            "url", endpoint.getUrl()
        );

        // 3. 构建 Spring AI Document 对象
        Document doc = new Document(documentContent, metadata);

        // 4. 计算 Embedding 并写入 JVector (Spring AI 自动调用 embeddingModel)
        vectorStore.add(List.of(doc));
    }
}
```

#### 2. 检索增强生成 (Retrieval & Generation)

当用户在前端询问：“如何获取订单的返利金额？”：

```java
@Service
public class RagQueryService {

    private final ChatClient chatClient; // Spring AI 1.1.2 的核心对话客户端
    private final VectorStore vectorStore;

    public String answerApiQuestion(Long projectId, String userQuery) {
        // 1. 构造带租户隔离的向量检索请求
        SearchRequest searchRequest = SearchRequest.builder()
                .query(userQuery)
                .topK(3) // 取相关度最高的 3 个接口
                .filterExpression(new FilterExpressionBuilder().eq("projectId", projectId).build())
                .build();

        // 2. 从 JVector 中检索相关文档块
        List<Document> similarDocuments = vectorStore.similaritySearch(searchRequest);

        // 3. 提取接口信息和跳转 ID
        String context = similarDocuments.stream()
                .map(Document::getContent)
                .collect(Collectors.joining("\n\n---\n\n"));
        
        List<String> referenceIds = similarDocuments.stream()
                .map(doc -> doc.getMetadata().get("endpointId").toString())
                .toList();

        // 4. 组装 System Prompt，严格约束大模型只能根据 Context 回答
        String systemPrompt = """
                你是一个专业的 API 对话助手。
                请严格基于以下【参考接口文档】回答用户问题。
                如果参考文档中没有相关信息，请直接回答“未找到相关接口”，不要编造。
                
                【参考接口文档】:
                {context}
                """;

        // 5. 调用大模型生成最终答案 (使用 Spring AI 1.1.2 的流式 API)
        String answer = chatClient.prompt()
                .system(sys -> sys.text(systemPrompt).param("context", context))
                .user(userQuery)
                .call()
                .content();

        // 将 referenceIds 附带在返回结果中，前端可以渲染为可点击的卡片
        return buildFinalResponse(answer, referenceIds);
    }
}
```

这样一套架构，既保证了切块逻辑完全契合业务实体，又利用纯 Java 技术栈做到了高性能和低部署成本。

基于 RAG 架构在生产环境落地的核心痛点。处理好增量更新和向量持久化，是保证 AI 问答精准度的关键。

### 一、 增量推送下的“平滑失效与替换”机制

当 DocForge 引擎发起增量推送（Payload 中包含 Added、Modified、Removed 列表）到达 ApiHub 时，我们需要保证数据库与向量库的绝对一致性，且在这个过程中不能影响前端用户的并发提问。

核心思路是：**以关系型数据库为单一事实来源（Single Source of Truth），通过记录 Document ID 来实现精准的 Upsert（更新即替换）操作。**

#### 1. 建立关联映射 (MyBatis-Plus 层面)
Spring AI 在将 Document 存入向量库时，会生成一个唯一的 UUID 作为 Document ID。我们需要在 ApiHub 的 `api_endpoint` 实体表中增加一个字段，将这个 ID 存下来。

```sql
ALTER TABLE api_endpoint ADD COLUMN vector_doc_id VARCHAR(36) COMMENT '关联的向量文档 ID';
```

#### 2. 处理增量 Payload 的流转逻辑
在 Spring AI 1.1.2 的 `VectorStore` 接口中，并没有直接的 `update` 方法，标准做法是**先删后插**。当 ApiHub 接收到增量推送时，按以下逻辑处理：

* **对于 Removed（已删除的接口）**：
  * 通过 MyBatis-Plus 查询出这些接口原有的 `vector_doc_id`。
  * 调用 `vectorStore.delete(List.of(vectorDocId))` 将其从 JVector 中抹除。
* **对于 Added（新增的接口）**：
  * 构建 Markdown 文本块，调用 Embedding 模型生成向量。
  * 调用 `vectorStore.add(List.of(newDocument))`。
  * 获取 `newDocument.getId()`，通过 MyBatis-Plus 回写到该接口的 `vector_doc_id` 字段。
* **对于 Modified（有变更的接口） - 这是“平滑替换”的关键**：
  * **步骤 A**：先根据业务数据库中的旧 `vector_doc_id`，调用 `vectorStore.delete()` 删除旧向量。
  * **步骤 B**：根据最新的接口定义生成全新的 Document 文本块和 Embedding。
  * **步骤 C**：调用 `vectorStore.add()` 写入新向量，并将全新的 ID 更新到数据库。

#### 3. 事务与隔离性保证
为了防止由于网络抖动导致数据库更新了，但向量库没更新（或者反过来），建议将向量库的变更放在关系型数据库事务提交之后的钩子（After Commit Hook）中异步执行。如果向量写入失败，可以通过定时任务比对业务表的 `updated_at` 和向量库的状态进行最终一致性补偿。

---

### 二、 JVector 的持久化机制设计

JVector 本质上是一个嵌入式的（Embedded）向量引擎，它跑在应用的 JVM 进程里。如果不做持久化，应用一重启，内存里的 HNSW 图索引和向量数据就会全部丢失。

#### 1. JVector 原生的持久化能力
JVector 并不依赖外部数据库，它原生支持将构建好的 HNSW 图和向量数据直接序列化到本地磁盘，并在启动时通过**内存映射文件（mmap）**极速加载。

在 Spring AI 的体系中，你可以通过配置让它在启动和销毁时自动处理持久化文件：

```java
@Configuration
public class JVectorConfig {

    @Value("${apihub.vector.index-path:./data/jvector-index}")
    private String indexPath;

    @Bean
    public VectorStore jvectorStore(EmbeddingModel embeddingModel) {
        // 伪代码：指定持久化路径
        JVectorStore store = new JVectorStore(embeddingModel);
        
        // 启动时，如果本地文件存在，则反序列化加载
        File indexFile = new File(indexPath);
        if (indexFile.exists()) {
            store.load(indexFile); 
        }
        return store;
    }

    // 监听 Spring 容器关闭事件，优雅关机时落盘
    @PreDestroy
    public void saveOnShutdown() {
        vectorStore.save(new File(indexPath));
    }
}
```
*注：还可以配合定时任务，每隔一小时自动触发一次 `save()`，防止进程意外崩溃导致数据丢失。*

#### 2. 在 ApiHub 分布式部署架构下的适配方案 (可选项)
根据需求背景中的架构图，ApiHub 的生产环境是双节点负载均衡（×2, 负载均衡）。这就是嵌入式向量库（包括 JVector）会遇到的最大痛点：**节点间的数据不一致**。

节点 A 收到 DocForge 的推送更新了它本地的 JVector，但节点 B 本地的 JVector 并不知道，会导致用户请求打到节点 B 时查出旧数据。

针对这种架构，有以下两种优雅的解法：

**方案:广播更新（推荐，贴合现有技术栈）**
既然 ApiHub 技术栈里已经有了 Redis (Cluster)，我们可以利用 Redis 的 Pub/Sub 或 Stream 机制。
1. 当 DocForge 推送接口变更到其中一个 ApiHub 节点时，该节点更新完 MySQL 主库后，向 Redis 发送一条“接口 ID: xxx 需更新向量”的广播消息。
2. 所有的 ApiHub 节点（包括接收推送的那个节点本身）监听这个消息。
3. 每个节点收到消息后，各自查库，利用大模型计算 Embedding，并更新自己 JVM 里的 JVector。
   *这样既保留了 JVector 毫秒级检索的性能优势，又解决了多节点一致性问题。*


除了已经详细拆解的**智能 Mock 数据**和 **RAG 文档问答**，我们在《需求背景.md》中还规划了另外 4 个核心 AI 辅助功能。

结合 Spring Boot 3.2 和 Spring AI 1.1.2 的底层特性，以下是这 4 个功能的技术落地与架构设计方案：

---

### 一、 📝 AI 生成接口描述 (AI API Description)

这个功能旨在解决开发者“只写代码、不写注释”的痛点，通过反推 API 的结构化定义来生成清晰的业务描述。

**1. 核心提示词策略 (Prompt Strategy)**
我们需要给 LLM 设定一个“资深技术文档工程师”的人设，并提供充足的上下文，特别是涉及特定业务系统（如财务核算、ERP 同步）时，需要让它推导业务意图。

**2. Spring AI 代码落地**
利用 Spring AI 的 `ChatClient` 和字符串模板，可以直接将解析出的接口参数映射进 Prompt。

```java
@Service
public class AiDescriptionService {

    private final ChatClient chatClient;

    public String generateDescription(ApiEndpoint endpoint) {
        String promptTemplate = """
            你是一个资深的技术文档工程师。请根据以下接口信息，编写一段清晰、专业的接口业务描述。
            要求：说明该接口的核心用途、调用场景以及需要注意的业务规则（如财务计算、系统对接等）。
            不要超过 200 字，直接输出描述文本，不要带有 Markdown 代码块。
            
            接口路径：{method} {url}
            请求参数：{parameters}
            响应结果：{responses}
            """;

        return chatClient.prompt()
                .user(u -> u.text(promptTemplate)
                        .param("method", endpoint.getHttpMethod())
                        .param("url", endpoint.getUrl())
                        // 将树形参数结构展平为 JSON 字符串
                        .param("parameters", flattenParams(endpoint.getParameters()))
                        .param("responses", flattenResponses(endpoint.getResponses())))
                .call()
                .content();
    }
}
```
*场景模拟*：当接口为 `POST /api/v1/kingdee/rebate/sync`，包含 `dealerId`、`discountAmount` 时，大模型会自动生成类似：“该接口用于将计算完毕的经销商返利与折扣金额异步同步至金蝶财务系统，调用前需确保返利金额已完成最终核算审批。”的精准描述。

---

### 二、 🧪 AI 生成测试用例 (AI Test Case Suggestion)

该功能需要 AI 不仅理解接口，还要具备 QA 的思维，输出能够直接导入到 ApiHub `test_suite`（测试集合）中执行的结构化数据。

**1. 核心提示词策略 (Prompt Strategy)**
必须强制约束大模型输出 JSON 数组，涵盖“正向流程 (Happy Path)”、“边界值”、“异常处理”三种基本分类。

**2. Spring AI 代码落地 (结构化输出)**
使用 `BeanOutputConverter` 强制将大模型的输出映射为 Java Record 集合。

```java
// 1. 定义期望的结构化类型
record TestCaseSuggestion(
    String caseName, 
    String caseType, // "HAPPY_PATH", "BOUNDARY", "ABNORMAL"
    Map<String, Object> requestBody, 
    Integer expectedStatus, 
    List<String> assertions // 例如：["$.code == 0", "$.data.total > 0"]
) {}

@Service
public class AiTestCaseService {

    private final ChatClient chatClient;

    public List<TestCaseSuggestion> generateTestCases(ApiEndpoint endpoint) {
        var converter = new BeanOutputConverter<>(
                new ParameterizedTypeReference<List<TestCaseSuggestion>>() {});

        String prompt = """
            请作为资深 QA 工程师，为以下接口生成自动化测试用例。
            包含正常场景、必填项缺失、参数越界等场景。
            
            接口定义：
            {endpointDef}
            
            {formatInstructions}
            """;

        String response = chatClient.prompt()
                .user(u -> u.text(prompt)
                        .param("endpointDef", serializeEndpoint(endpoint))
                        .param("formatInstructions", converter.getFormat()))
                .call()
                .content();

        return converter.convert(response);
    }
}
```
*落地链路*：前端接收到这个 JSON 数组后，渲染为用例列表。用户勾选后，直接存入关系型数据库的 `test_step` 表中，无缝衔接自动化测试编排引擎。

---

### 三、 📊 AI 变更影响分析 (Change Impact Analysis)

当 DocForge 引擎增量推送触发变更时，不仅要在 UI 上展示 Diff 高亮，还需要 AI 介入分析这次变更是 Breaking (破坏性) 还是 Non-Breaking，并输出排查建议。

**1. 核心提示词策略 (Prompt Strategy)**
输入 ApiHub Diff 引擎计算出的抽象变更记录，输出面向前端开发和测试的兼容性报告。

**2. 触发与实现链路**

```java
@Service
public class AiImpactAnalysisService {

    private final ChatClient chatClient;

    /**
     * 该方法可在 Diff 引擎计算完成后异步触发
     */
    public String analyzeImpact(DiffResult diffResult) {
        // 如果没有实质性变更，直接跳过
        if (!diffResult.hasChanges()) return "无实质性变更。";

        String prompt = """
            你是一个架构评审专家。以下是某 API 接口的版本变更(Diff)明细。
            请分析本次变更对调用方（如前端、移动端或其他微服务）的影响，并输出一份简明的兼容性评估报告。
            
            要求：
            1. 明确指出是否包含破坏性变更 (Breaking Change)。
            2. 给出调用方需要配合修改的具体建议。
            
            变更明细：
            {diffSummary}
            """;

        return chatClient.prompt()
                .user(u -> u.text(prompt)
                        .param("diffSummary", diffResult.toJsonSummary()))
                .call()
                .content();
    }
}
```
*场景模拟*：如果 Diff 引擎检测到响应字段 `msg` 被改名为了 `message`，且分页参数 `page` 变成了必填项。大模型会明确高亮警告：这是破坏性变更，下游依赖 `msg` 字段的逻辑将抛出 NPE，前端需同步补充 `page` 参数的传值。

---

### 四、 💻 AI 代码示例生成 (Code Snippet Generation)

将抽象的 API 定义转换为开发者可以直接 Copy-Paste 的真实请求代码。

**1. 核心提示词策略 (Prompt Strategy)**
利用 System Prompt 注入特定语言的最佳实践（例如 Java 推荐使用 `HttpClient` 或 `OkHttp`，前端推荐使用 `Axios` 或 `fetch`）。

**2. Spring AI 代码落地**

```java
@Service
public class AiCodeSnippetService {

    private final ChatClient chatClient;

    public String generateCodeSnippet(ApiEndpoint endpoint, String targetLanguage) {
        String systemPrompt = """
            你是一个多语言开发者。请根据用户提供的 API 定义，生成使用 {language} 语言发起 HTTP 请求的代码片段。
            要求：
            1. 代码必须是可运行的，包含必要的请求头（如 Content-Type）。
            2. 如果是 Java，请优先使用 JDK 11+ 原生的 HttpClient。
            3. 如果是前端代码，请优先使用 Axios。
            4. 只需要输出代码，包裹在 Markdown 的代码块中。
            """;

        return chatClient.prompt()
                .system(s -> s.text(systemPrompt).param("language", targetLanguage))
                .user(serializeEndpointWithMockData(endpoint)) // 注入包含 Mock 参数的接口数据
                .call()
                .content();
    }
}
```
*落地链路*：前端在“浏览模式”右侧的代码示例卡片中，提供 `Java`, `TypeScript`, `cURL`, `Go` 的语言切换下拉框。
每次切换时，如果缓存中没有对应语言的片段，则请求后端该接口实时生成并缓存到 Redis 中（设置较长的过期时间，只要接口不更新，缓存就不失效）。
当然 Redis只是可选项，所以这个优化也是可选项
