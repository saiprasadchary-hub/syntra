import { TerminalService } from './TerminalService';

export class TaskManager {
    private terminalService: TerminalService;

    constructor(terminalService: TerminalService) {
        this.terminalService = terminalService;
    }

    public runBuild() {
        this.terminalService.runTask('npm run build');
    }

    public runDev() {
        this.terminalService.runTask('npm run dev');
    }

    public runTest() {
        this.terminalService.runTask('npm test');
    }

    public configureTasks() {
        // In a real IDE, this would open tasks.json
        (window as any).AntigravityAPI.openProjectFile('package.json');
        (window as any).AntigravityAPI.notify('Configure tasks by editing package.json scripts.', 'info');
    }
}
