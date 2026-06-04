const zipInput = document.getElementById("zipInput");
const patchBtn = document.getElementById("patchBtn");
const uidContainer = document.getElementById("uidContainer");
const log = document.getElementById("log");

const API_URL = "https://ff-servidor-oculto.onrender.com/patch";

function addLog(t, cls="info"){
    log.innerHTML += `<div class="${cls}">➜ ${t}</div>`;
    log.scrollTop = log.scrollHeight;
}

zipInput.addEventListener("change", () => {
    if (zipInput.files[0]) {
        log.innerHTML = "";
        addLog("MAPA CARREGADO. PRONTO PARA ENVIAR.", "info");
        patchBtn.disabled = false;
    }
});

patchBtn.onclick = async () => {
    const file = zipInput.files[0];
    if(!file) return;

    patchBtn.disabled = true;
    log.innerHTML = "";
    addLog("CONECTANDO AO SERVIDOR SEGURO...", "info");

    // --- SISTEMA DE LOGS AUTOMÁTICOS (ENTRETENIMENTO) ---
    const mensagens = [
        "Despertando os sistemas do servidor oculto...",
        "Localizando arquivos de dados do mapa (ProjectData)...",
        "Validando a estrutura do Modo de Criação...",
        "Injetando códigos e otimizando os blocos...",
        "Equipando as skins selecionadas no banco de dados...",
        "Finalizando a criptografia do arquivo .ZIP...",
        "Quase pronto! Organizando o download do mapa..."
    ];
    
    let msgIndex = 0;
    // Dispara uma mensagem nova a cada 3.5 segundos
    const logInterval = setInterval(() => {
        if (msgIndex < mensagens.length) {
            addLog(mensagens[msgIndex], "info");
            msgIndex++;
        }
    }, 3500);
    // -----------------------------------------------------

    const formData = new FormData();
    formData.append("mapa", file);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        // Para as mensagens automáticas assim que o servidor responder
        clearInterval(logInterval);

        if (!response.ok) {
            throw new Error("O servidor recusou o arquivo ou encontrou um erro.");
        }

        addLog("PROCESSANDO MAPA E INJETANDO ALTERAÇÕES...", "info");
        
        const blob = await response.blob();
        const finalUrl = URL.createObjectURL(blob);
        
        const timestamp = Date.now();
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = `patched_${timestamp}.zip`;
        a.click();

        addLog("CONCLUÍDO COM SUCESSO! SEU MAPA FOI ATUALIZADO.", "success");

    } catch (e) {
        // Garante que o intervalo pare se der erro
        clearInterval(logInterval);
        addLog(`FALHA NO SERVIDOR: ${e.message}`, "fail");
        console.error(e);
    } finally {
        patchBtn.disabled = false;
    }
};
