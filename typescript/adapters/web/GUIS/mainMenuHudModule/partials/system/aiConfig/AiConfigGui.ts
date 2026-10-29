import { logger } from "../../../../../shared/Logger";
import html from './aiConfig.html?raw';
import { ConfirmationModal } from '../../../../confirmationModalModule/ConfirmationModalGui';

export default class AiConfigGui {
    private container: HTMLElement;

    constructor(parentContainer: HTMLElement) {
        this.container = parentContainer;
        this.injectUI();
        this.setupAIConfig();
        logger.log('init', 'AiConfigGui instantiated and injected.');
    }

    private injectUI(): void {
        this.container.innerHTML = html;
    }

    private setupAIConfig(): void {
        const listContainer = this.container.querySelector('#models-list-container') as HTMLElement;
        const btnRefresh = this.container.querySelector('#btn-refresh-models') as HTMLButtonElement;
        const inputModel = this.container.querySelector('#ollama-model-input') as HTMLInputElement;
        const btnPull = this.container.querySelector('#btn-pull-model') as HTMLButtonElement;
        
        const progressContainer = this.container.querySelector('#pull-progress-container') as HTMLElement;
        const statusText = this.container.querySelector('#ollama-pull-status') as HTMLElement;
        const percentText = this.container.querySelector('#ollama-pull-percent') as HTMLElement;
        const progressBar = this.container.querySelector('#ollama-pull-bar') as HTMLElement;

        if (!listContainer || !btnRefresh || !inputModel || !btnPull) return;

        const formatBytes = (bytes: number) => {
            if (bytes === 0) return '0 B';
            const k = 1024, dm = 2, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        };

        const loadModels = async () => {
            try {
                listContainer.innerHTML = '<div style="color: #aaa; padding: 20px; text-align: center; font-family: monospace;">Buscando oráculos...</div>';
                const res = await fetch('http://localhost:11434/api/tags');
                if (!res.ok) throw new Error('Falha ao conectar com Ollama');
                const data = await res.json();
                
                listContainer.innerHTML = '';
                const activeModel = localStorage.getItem('selected_llm_model') || '';

                if (data.models && data.models.length > 0) {
                    data.models.forEach((m: any) => {
                        const isSelected = m.name === activeModel;
                        
                        const itemDiv = document.createElement('div');
                        itemDiv.style.display = 'flex';
                        itemDiv.style.justifyContent = 'space-between';
                        itemDiv.style.alignItems = 'center';
                        itemDiv.style.padding = '12px 15px';
                        itemDiv.style.marginBottom = '8px';
                        itemDiv.style.background = isSelected ? 'rgba(85, 170, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)';
                        itemDiv.style.border = isSelected ? '1px solid #55aaff' : '1px solid #444';
                        itemDiv.style.borderRadius = '5px';

                        const infoDiv = document.createElement('div');
                        infoDiv.innerHTML = `
                            <div style="color: ${isSelected ? '#55aaff' : '#fff'}; font-size: 18px; font-family: \\'Minecraft\\', monospace;">${m.name}</div>
                            <div style="color: #888; font-size: 12px; margin-top: 4px; font-family: monospace;">Tamanho: ${formatBytes(m.size)}</div>
                        `;

                        const actionsDiv = document.createElement('div');
                        actionsDiv.style.display = 'flex';
                        actionsDiv.style.gap = '10px';

                        const selectBtn = document.createElement('button');
                        selectBtn.textContent = isSelected ? 'Ativo' : 'Selecionar';
                        selectBtn.style.padding = '6px 12px';
                        selectBtn.style.background = isSelected ? '#55aaff' : '#222';
                        selectBtn.style.color = isSelected ? '#000' : '#fff';
                        selectBtn.style.border = isSelected ? '1px solid #55aaff' : '1px solid #666';
                        selectBtn.style.borderRadius = '4px';
                        selectBtn.style.cursor = isSelected ? 'default' : 'pointer';
                        selectBtn.style.fontFamily = "'Minecraft', monospace";
                        selectBtn.disabled = isSelected;
                        selectBtn.onclick = () => {
                            localStorage.setItem('selected_llm_model', m.name);
                            loadModels();
                        };

                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = 'Apagar';
                        deleteBtn.style.padding = '6px 12px';
                        deleteBtn.style.background = '#8a0303';
                        deleteBtn.style.color = '#fff';
                        deleteBtn.style.border = '1px solid #ff4444';
                        deleteBtn.style.borderRadius = '4px';
                        deleteBtn.style.cursor = 'pointer';
                        deleteBtn.style.fontFamily = "'Minecraft', monospace";
                        deleteBtn.onclick = async () => {
                            const confirmed = await ConfirmationModal.confirm({
                                title: 'Excluir Modelo',
                                message: `Despertar e apagar permanentemente a inteligência '${m.name}'?`,
                                confirmText: 'Apagar',
                                cancelText: 'Cancelar',
                                variant: 'danger'
                            });
                            if (confirmed) {
                                deleteBtn.disabled = true;
                                deleteBtn.textContent = '...';
                                try {
                                    await fetch('http://localhost:11434/api/delete', {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ name: m.name })
                                    });
                                    if (isSelected) localStorage.removeItem('selected_llm_model');
                                    loadModels();
                                } catch (e) {
                                    await ConfirmationModal.alert({
                                        title: 'Erro',
                                        message: 'Falha ao apagar modelo.',
                                        variant: 'danger'
                                    });
                                    deleteBtn.disabled = false;
                                    deleteBtn.textContent = 'Apagar';
                                }
                            }
                        };

                        actionsDiv.appendChild(selectBtn);
                        actionsDiv.appendChild(deleteBtn);

                        itemDiv.appendChild(infoDiv);
                        itemDiv.appendChild(actionsDiv);
                        listContainer.appendChild(itemDiv);
                    });
                } else {
                    listContainer.innerHTML = '<div style="color: #aaa; padding: 20px; text-align: center; font-family: monospace;">O vazio ressoa. Nenhum modelo encontrado.</div>';
                }
            } catch (e) {
                listContainer.innerHTML = '<div style="color: #ff5555; padding: 20px; text-align: center; font-family: monospace;">Falha ao conectar com o servidor Ollama (localhost:11434). Certifique-se que o serviço está rodando.</div>';
                logger.log('error', 'Ollama fetch error', e);
            }
        };

        const pullModel = async () => {
            const modelName = inputModel.value.trim();
            if (!modelName) return;
            
            btnPull.disabled = true;
            inputModel.disabled = true;
            progressContainer.style.display = 'block';
            statusText.textContent = `Iniciando invocação de ${modelName}...`;
            percentText.textContent = '0%';
            progressBar.style.width = '0%';
            
            try {
                const res = await fetch('http://localhost:11434/api/pull', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: modelName })
                });
                
                if (!res.ok) throw new Error('Erro ao iniciar pull');
                if (!res.body) throw new Error('Corpo da resposta vazio');
                
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\\n').filter(l => l.trim().length > 0);
                    
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.status) {
                                statusText.textContent = data.status;
                                if (data.completed && data.total) {
                                    const percentVal = (data.completed / data.total) * 100;
                                    percentText.textContent = `${percentVal.toFixed(1)}%`;
                                    progressBar.style.width = `${percentVal}%`;
                                }
                            }
                        } catch(e) {}
                    }
                }
                statusText.textContent = `Invocação concluída!`;
                progressBar.style.width = '100%';
                percentText.textContent = '100%';
                inputModel.value = '';
                
                localStorage.setItem('selected_llm_model', modelName);
                
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    loadModels();
                }, 2000);
            } catch (e) {
                statusText.textContent = `Erro crítico: ${(e as Error).message}`;
                logger.log('error', 'Ollama pull error', e);
            } finally {
                btnPull.disabled = false;
                inputModel.disabled = false;
            }
        };

        btnRefresh.addEventListener('click', loadModels);
        btnPull.addEventListener('click', pullModel);

        loadModels();
    }
}
