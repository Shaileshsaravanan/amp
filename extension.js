const vscode = require('vscode');
const WebSocket = require('ws');

let ws;
let statusBarItem;
let startTime;
let currentFolderName = '';
let currentFileName = '';
let currentFileType = '';

function activate(context) {
    console.log('Congratulations, your extension "amp" is now active!');

    startTime = new Date();

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'extension.showWebSocketOptions';
    statusBarItem.text = '$(plug) Set WebSocket URL';
    statusBarItem.tooltip = 'Set the WebSocket Server URL';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const updateInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const elapsed = new Date() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            statusBarItem.text = `$(plug) Connected | Uptime: ${minutes}m ${seconds}s`;

            const data = {
                uptime: `${minutes}m ${seconds}s`,
                folderName: currentFolderName,
                fileName: currentFileName,
                fileType: currentFileType
            };
            ws.send(JSON.stringify(data));
        } else {
            statusBarItem.text = '$(plug) Set WebSocket URL';
        }
    }, 1000); 

    context.subscriptions.push({
        dispose: () => clearInterval(updateInterval)
    });

    let helloWorldCommand = vscode.commands.registerCommand('amp.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from amp extension!');
    });

    context.subscriptions.push(helloWorldCommand);

    let connectCommand = vscode.commands.registerCommand('extension.connect', () => {
        const url = context.workspaceState.get('websocketUrl');
        if (!url) {
            vscode.window.showErrorMessage('WebSocket URL is not set');
            setWebSocketUrl(context);
        } else {
            connectWebSocket(context, url);
        }
    });

    let setUrlCommand = vscode.commands.registerCommand('extension.setWebSocketUrl', async () => {
        await setWebSocketUrl(context);
    });

    let showOptionsCommand = vscode.commands.registerCommand('extension.showWebSocketOptions', async () => {
        const options = ['Reconnect', 'Change WebSocket URL', 'Show Current Session Uptime'];
        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select an option'
        });

        if (choice === 'Reconnect') {
            const url = context.workspaceState.get('websocketUrl');
            if (!url) {
                vscode.window.showErrorMessage('WebSocket URL is not set');
                await setWebSocketUrl(context);
            } else {
                connectWebSocket(context, url);
            }
        } else if (choice === 'Change WebSocket URL') {
            await setWebSocketUrl(context);
        } else if (choice === 'Show Current Session Uptime') {
            const elapsed = new Date() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            vscode.window.showInformationMessage(`Current Session Uptime: ${minutes}m ${seconds}s`);
        }
    });

    context.subscriptions.push(connectCommand);
    context.subscriptions.push(setUrlCommand);
    context.subscriptions.push(showOptionsCommand);

    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        updateFolderInfo();
    });

    vscode.window.onDidChangeActiveTextEditor(() => {
        updateFileInfo();
    });

    const savedUrl = context.workspaceState.get('websocketUrl');
    if (!savedUrl) {
        vscode.window.showErrorMessage('WebSocket URL is not set');
        setWebSocketUrl(context);
    } else {
        connectWebSocket(context, savedUrl);
    }

    updateFolderInfo();
    updateFileInfo();
}

async function setWebSocketUrl(context) {
    const url = await vscode.window.showInputBox({
        prompt: 'Enter the WebSocket server URL',
        placeHolder: 'ws://localhost:8080'
    });

    if (url) {
        await context.workspaceState.update('websocketUrl', url);
        vscode.window.showInformationMessage(`WebSocket URL set to ${url}`);
        connectWebSocket(context, url);
    } else {
        vscode.window.showErrorMessage('WebSocket URL not set');
    }
}

function connectWebSocket(context, url) {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        ws = new WebSocket(url);

        ws.on('open', () => {
            vscode.window.showInformationMessage('Connected to WebSocket server');
            statusBarItem.text = '$(plug) Connected';
        });

        ws.on('message', (data) => {
            vscode.window.showInformationMessage(`Message from server: ${data}`);
        });

        ws.on('close', () => {
            vscode.window.showInformationMessage('Disconnected from WebSocket server');
            statusBarItem.text = '$(plug) Set WebSocket URL';
        });

        ws.on('error', (error) => {
            vscode.window.showErrorMessage(`WebSocket error: ${error.message}`);
            statusBarItem.text = '$(plug) Set WebSocket URL';
        });
    } else {
        vscode.window.showInformationMessage('Already connected to WebSocket server');
    }
}

function updateFolderInfo() {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
        currentFolderName = folders[0].name;
    } else {
        currentFolderName = 'No folder is currently open';
    }
}

function updateFileInfo() {
    const activeFile = vscode.window.activeTextEditor?.document.fileName;
    if (activeFile) {
        currentFileName = activeFile;
        currentFileType = activeFile.split('.').pop();
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                uptime: getUptime(),
                folderName: currentFolderName,
                fileName: currentFileName,
                fileType: currentFileType
            }));
        }
    } else {
        currentFileName = '';
        currentFileType = '';
    }
}

function getUptime() {
    const elapsed = new Date() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

function deactivate() {
    if (ws) {
        ws.close();
    }
}

module.exports = {
    activate,
    deactivate
};