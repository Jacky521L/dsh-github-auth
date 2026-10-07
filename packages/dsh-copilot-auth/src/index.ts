import { endpoint, type CopilotContext } from '../../../shared/contracts.ts';
import { CopilotController, COPILOT_KEY, filterCopilotCatalog } from './controller.ts';
export const inject = ['connection', 'authorization', 'credentials', 'sessionController', 'llm'];
export function apply(ctx: CopilotContext): void {
  const service = ctx.sessionController;
  const originalCatalog = service.modelCatalog;
  const filteredCatalog: typeof originalCatalog = async () => {
    const catalog = await originalCatalog.call(service);
    let available: unknown;
    try {
      const record = await ctx.credentials.readRecord(COPILOT_KEY);
      available = record?.kind === 'grant'
        ? (record.payload as { availableModelIds?: unknown } | undefined)?.availableModelIds
        : undefined;
    } catch { /* A locked credential store hides Copilot without hiding other providers. */ }
    return filterCopilotCatalog(catalog, available);
  };
  service.modelCatalog = filteredCatalog;
  ctx.on('credentials/record-updated', key => {
    if (key === COPILOT_KEY) ctx.llm.emitAdaptersUpdated();
  });
  const controller = new CopilotController(ctx);
  endpoint(ctx, '/api/dsh-copilot-auth', ['status', 'login', 'answer', 'cancel', 'logout', 'models'], async body => {
    switch (body.action) {
      case 'login': return controller.begin();
      case 'answer': controller.answer(body.promptId, body.value); break;
      case 'cancel': await controller.cancel(); break;
      case 'logout': await controller.signOut(); break;
      case 'models': return controller.checkModels();
    }
    return controller.status();
  });
  ctx.on('dispose', () => {
    if (service.modelCatalog === filteredCatalog) service.modelCatalog = originalCatalog;
    return controller.dispose();
  });
}
