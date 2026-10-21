# 阶段 5.2 报告：CSV 迁移中心

- 当前 commit：本次提交（见 `git log`）
- 日期：2026-10-21

## 实现

### 数据
- `import_batches`：kind（tasks/questions）、filename、status（previewed/committed/rolled_back）、raw_csv、sha256、总/有效/无效行数、时间戳
- `import_items`：批次内逐行 payload、状态（pending/created/skipped/failed）、entity_id、错误

### API
- `POST /api/v1/imports/preview`：解析 CSV（引号、逗号、换行、BOM），逐行校验并保存批次与原件
- `GET /api/v1/imports?spaceId`：批次列表
- `GET /api/v1/imports/:id/original`：下载原件，返回 `x-content-sha256`
- `POST /api/v1/imports/:id/commit`：只导入有效行，记录 entity_id；幂等（重复提交 409）
- `POST /api/v1/imports/:id/rollback`：软删除已创建实体，保留批次与原件；重复回滚 409

### Web
- 空间页「迁移中心（CSV）」面板：选择文件/粘贴 CSV、类型切换、预览表（有效/错误）、确认导入、批次列表、下载原件、回滚

## 测试

- `test/csv.test.ts`（4 个）：引号/换行/BOM、任务与题目校验
- `test/imports.integration.test.ts`（5 个）：预览不落实体、原件校验、提交、回滚、跨用户隔离
- `pnpm test`：106 passed（contracts 10、api 96）
- `pnpm test:e2e`：15 passed（新增 CSV 预览+导入）
- `pnpm lint` / `typecheck` / `build`：通过

## 未完成

- Anki / Notion / Markdown 导入
- 字段映射、去重、导入前编辑
- 多模态（转写/OCR）、作品集页面
