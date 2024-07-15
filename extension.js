const vscode = require('vscode');
const WebSocket = require('ws');

let ws;

function activate(context) {
    console.log('Congratulations, your extension "amp" is now active!');

    // Register the helloWorld command
    let helloWorldCommand = vscode.commands.registerCommand('amp.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from amp extension!');
    });

    const savedUrl = context.workspaceState.get('websocketUrl');
    if (!savedUrl) {
        setWebSocketUrl(context);
    }

    let connectCommand = vscode.commands.registerCommand('extension.connect', () => {
        const url = context.workspaceState.get('websocketUrl');
        if (!url) {
            vscode.window.showErrorMessage('WebSocket URL is not set');
            return;
        }

        if (!ws || ws.readyState === WebSocket.CLOSED) {
            ws = new WebSocket(url);

            ws.on('open', () => {
                vscode.window.showInformationMessage('Connected to WebSocket server');
            });

            ws.on('message', (data) => {
                vscode.window.showInformationMessage(`Message from server: ${data}`);
            });

            ws.on('close', () => {
                vscode.window.showInformationMessage('Disconnected from WebSocket server');
            });

            ws.on('error', (error) => {
                vscode.window.showErrorMessage(`WebSocket error: ${error.message}`);
            });
        } else {
            vscode.window.showInformationMessage('Already connected to WebSocket server');
        }
    });

    let sendMessageCommand = vscode.commands.registerCommand('extension.sendMessage', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send('Hello from VSCode extension!');
        } else {
            vscode.window.showErrorMessage('Not connected to WebSocket server');
        }
    });

    let setUrlCommand = vscode.commands.registerCommand('extension.setWebSocketUrl', async () => {
        await setWebSocketUrl(context);
    });

    context.subscriptions.push(helloWorldCommand);
    context.subscriptions.push(connectCommand);
    context.subscriptions.push(sendMessageCommand);
    context.subscriptions.push(setUrlCommand);
}

async function setWebSocketUrl(context) {
    const url = await vscode.window.showInputBox({
        prompt: 'Enter the WebSocket server URL',
        placeHolder: 'ws://localhost:8080'
    });

    if (url) {
        await context.workspaceState.update('websocketUrl', url);
        vscode.window.showInformationMessage(`WebSocket URL set to ${url}`);
    } else {
        vscode.window.showErrorMessage('WebSocket URL not set');
    }
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