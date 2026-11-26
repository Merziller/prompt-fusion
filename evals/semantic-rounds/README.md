# 语义增强逐轮评测证据

这里保存的是24条基准输入的真实四候选模型调用与匿名评审，不是演示输出。原始用户会话、账户资料、认证头和令牌不属于此目录。生成器不按案例ID查表，评测执行时冻结源码；文件按原结果保留，失败轮次也不删除。

## 怎么复算

从仓库根目录运行；不需要模型、不联网、不执行快照源码：

```sh
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-01
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-02
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-03
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-04
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-05
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-06
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-07
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-08
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-09
node scripts/score-evaluation.mjs evals/semantic-rounds/semantic-round-10
# 校验各轮同题、同评审和同对照请求，并输出综合报告
node scripts/evaluation-report.mjs evals/semantic-rounds
```

工具先核对`integrity.json`列出的文件长度和SHA-256，再校验24条输入摘要、四候选实际输出与48条匿名评审的对应关系、正反顺序、失败重试是否保持原请求，最后复算两组均值、逐例最低分和关键错误闸。它只处理记录，不调用模型。缺失记录、篡改、重复有效评分、改变重试请求均报错；完整记录不代表达标，需查看`passed`。

## 每轮目录

| 文件 | 内容 |
| --- | --- |
| `evaluation.json` | 12条历史＋12条迁移输入、匿名映射、96份生成、固定评审请求、全部有效与失败评审尝试 |
| `generation-request.json` | 三款对照插件的实际模型提示词与本插件调用参数，含固定模型设置 |
| `calls.jsonl` | 各阶段实际请求、返回文字、错误、用量及耗时；无认证材料 |
| `scores.json` | 原始记录的确定性汇总，含逐例两次评分、理由及关键错误 |
| `runtime-manifest.json` | 运行时摘要、UI CSS摘要、冻结时间、评测设置说明 |
| `runtime/` | 当轮冻结的源码，仅供审阅，不由复算脚本执行 |
| `integrity.json` | 上述文件的长度、SHA-256及来源说明；是内容完整性记录，不是第三方签名 |

后续轮次完成后使用相同结构追加。每轮重新生成全部四臂，服务故障或劣质结果不拿重跑的高分内容替换。评审服务失败可用**完全相同**的请求补齐，首个有效结果保留，所有失败尝试保留。

## 口径及局限

- 固定12条输入来自此前三插件评测；迁移12条在优化前编写并冻结。它们不是独立抽样的全部用户场景，连续优化也会造成基准适配，必须如实披露。
- 三款对照：feiwell 0.2.0、ChosenXu 1.0.0 medium、Fishsb 3.5.1 base。仅复现模型侧入口，不测试它们的GUI、完整语音或所有模式。原生模板来自[来源审计](../../docs/SOURCE_AUDIT.md)列明的固定提交，许可证在[第三方声明](../../THIRD_PARTY_NOTICES.md)。
- 生成模型`deepseek-official/deepseek-v4.1-flash`，temperature 0.2、reasoning off。原插件模型输出上限4096 tokens，本插件每个阶段8192 tokens，且有两至三阶段审查：**调用成本和预算并不相等**。
- 匿名评审`tokenshop/gpt-6-astra`，两个相反顺序；保真30、清晰25、相关补全20、简洁15、任务边界10。评审不接收品牌或目标分数。它是模型评审，不是独立人工裁判，也不是任务完成率或下游性能的证明。
- 只在固定集、迁移集**分别均值≥95、每例平均≥90且零关键错误**时通过。失败生成强制零分，即使评审误给分也不采信。均分不能覆盖关键错误。
- 人工逐例审阅与自动评分分开保留。机械检查和多阶段模型均存在误报/漏报；一次基准通过不保证任意模型、语言或新输入都达到同等质量。

正式规格见[冻结协议](../../docs/evaluation/OPTIMIZATION_PROTOCOL.md)，当前状态见[验证报告](../../docs/VERIFICATION.md)。旧版约61分属于另一量尺的历史作者审计，不与本轮分数混报。
