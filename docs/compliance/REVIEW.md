# 源码公开场景的许可排查

审查日期：2026-11-23。使用范围由仓库所有者确认为**个人使用并公开源码**。

| 项目 | 本次范围 |
| --- | --- |
| 审查基准 | `322a5555100309a72453c22a5bf72314f6eede18` |
| 已提交 npm 锁文件条目 | 1444（包含平台可选依赖、开发依赖及工作区） |
| 外部不同包版本 | 1371 |
| 逐项媒体文件 | 221，全部与所比较上游的 Git blob 相同 |
| 声明仍无法确定的外部 npm 依赖 | 0 |

## 方法与证据

- 主项目 MIT 许可及原版权声明保持原样。
- [依赖逐项清单](dependencies.json) 保留每个锁文件、安装路径、版本、原许可字段、核对证据和需履行的条件。不是只检查直接依赖。
- 对全部已锁定外部 npm 包版本查询对应版本的 npm 注册表声明；注册表声明不等于已经审计该包每一行代码。
- [媒体逐项清单](assets.json) 按 Git blob 比对来源；字节相同证明来源一致，**不能代替独立的版权/商标授权证明**。
- [远程媒体引用](remote-assets.json) 来自已取得文本的扫描，区分测试/文档与应用引用；它不是远程服务器内容的授权书。动态 URL、运行时插件/用户上传内容不在固定源码资产范围内。
- [审查清单](review-manifest.json) 记录基准、数量、扫描覆盖和仓库内原生二进制。对比的 Pi 上游分支晚于个人快照；源码差异不自动算作个人新增内容。
- 注册表元数据、下载包内许可证和作者官方政策分开判断；未将“非 MIT”自动认定为违规，也未把根 MIT 许可覆盖到所有第三方内容。

## 已补充的归属

详见根目录 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。版权声明和附带许可全文保留；本次不修改依赖版本、不重新声明第三方作品归属。

## 具体结果

1. **Font Awesome 需要独立归属**：<code>src/icons/angle-down-solid.svg</code>、<code>angle-up-solid.svg</code>、<code>check-circle-solid.svg</code>、<code>x-circle-solid.svg</code> 的图形与 Font Awesome Free 匹配。SVG/JS 画作按 CC BY 4.0；React Icons 框架的 MIT 不替代图标本身许可。已补通知、许可文本和缺失的源码版权注释。
2. **Heroicons / Ionicons / Lucide**：实际导入的 React Icons 家族为 fa、fa6、hi2、io、io5、lu；本地 SVG 还匹配到 Heroicons v1/v2，npm 标志匹配 Simple Icons。已补充相应归属；Lucide 的文件同时包含 Feather 衍生图标的 MIT 通知，完整保留。
3. **字体**：Newsreader 唯一已提交字体文件与上游一致，原 OFL 文件完整，原源码已提供固定上游字体来源，并在构建中输出许可；没有替换字体或移除版权。系统字体名称只是调用操作系统字体，不等于随仓库分发这些字体。
4. **Khroma 2.1.0**：锁文件和 npm 元数据没有 license 字段，但其 npm tarball 的 <code>package/license</code> 是 MIT。下载包 SHA-512 与注册表 integrity 一致，已保存实际许可文本。这不是无许可证包。
5. **elkjs 0.12.1**：声明为 <code>EPL-2.0 OR GPL-3.0-or-later</code>；本项目在审查中采用允许选择的 EPL-2.0 路径，不把它改称 MIT。若再分发包含该组件的构建产物，需要保留 EPL 通知并提供对应组件源码获取方式，评估任何修改的源码义务。
6. **MPL**：lightningcss（含平台包）和 axe-core 等有 MPL-2.0 声明。MPL 以文件为单位规定义务，不是发现它就要求整个仓库改成 MPL。若分发或修改其覆盖文件，按实际文件处理义务；锁文件 dev 标记不等于是否进入最终安装包。DOMPurify 提供 MPL/Apache 许可选择，不能按单一标签推断整个产品。

## 仍待确认的具体材料

| 材料 | 已有证据 | 当前处理与进一步条件 |
| --- | --- | --- |
| <code>src/assets/notification.mp3</code> | 与上游完全相同，根 MIT 和来源链保留；没有找到独立的音效作者、素材站或单独许可声明 | 不列为“独立素材许可已证实”。当前保留在原软件来源上下文；若要排除来源争议，可向上游确认或换成自行合成的提示音，不把音效作为独立素材再分发。 |
| OpenHands 自身标识及桌面/网站图标 | 均来自上游，根 README 已明确个人非官方版本 | 未找到可覆盖本衍生项目一切用法的独立商标授权；不要据代码 MIT 宣称商标授权，亦不要包装为官方发布。 |
| Microsoft/Azure DevOps、DigitalOcean 及其他服务标识；<code>src/constants/acp-brand-marks.ts</code> 内的 Claude/Codex/Gemini/Pi/OpenCode 图形 | 作为兼容服务/Agent 的识别符，来源随上游保留 | 微软明确许多图标使用需要许可；这次没有取得逐个权利人的许可。已有来源说明不等于图标授权。如需对外产品品牌或宣传使用，应核对各家具体政策或使用文字/自有图形。 |

## 外部运行时边界

Canvas 的启动器还会安装 Python Agent Server/automation、下载 Node/uv、启动镜像或外部 MCP。npm 锁文件不能覆盖这些动态解析的传递依赖。已另记录 [固定 Python 服务](python-runtime.json) 的精确版本和实际 wheel 许可证据；没有把尚未锁定的所有 Python/系统/镜像依赖冒充为已完成逐包审查。本次只公开源码，不发布这些二进制或镜像。

## 当前结论与未做的保证

本次已完成清单范围内的 npm 许可声明逐项核对、已提交媒体的来源比对、字体许可证据及已识别图标归属补充。未发现声明要求“禁止个人使用/禁止公开源码”的外部 npm 包；这句话只描述所核对的许可证据，不是对整个程序及所有司法辖区作“绝无侵权”的结论。

没有调查专利有效性/全球商标注册、没有为上游资产取得新的商标授权，也没有把锁文件/根 MIT 当成第三方作品权利链保证。未覆盖未安装/未锁定的外部服务及用户内容；未来版本或安装包需重新核对实际包含内容。

## 主要依据

- [MIT 条款](https://opensource.org/license/mit)
- [Font Awesome Free 原许可](https://github.com/FortAwesome/Font-Awesome/blob/6.7.1/LICENSE.txt)
- [MPL 文件级义务说明](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)
- [EPL-2.0 原文](https://www.eclipse.org/legal/epl-2.0/)
- [Sharp 官方安装与许可说明](https://sharp.pixelplumbing.com/install/)
- [SIL Open Font License](https://openfontlicense.org/)
- [Microsoft 商标与品牌政策](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks)
- [Pi 原作者对代码许可及商标的说明](https://mariozechner.at/posts/2026-04-08-ive-sold-out/)
