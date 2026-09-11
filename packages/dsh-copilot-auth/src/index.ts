import { endpoint, type CopilotContext } from '../../../shared/contracts.ts';
import { CopilotController } from './controller.ts';
export const inject = ['connection', 'authorization', 'credentials', 'sessionController'];
export function apply(ctx: CopilotContext): void {
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
  ctx.on('dispose', () => controller.dispose());
}
