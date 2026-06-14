const zipInput = document.getElementById("zipInput");
const patchBtn = document.getElementById("patchBtn");
const closeBtn = document.getElementById("closeBtn"); // Captura o botão de fechar
const log = document.getElementById("log");
const API_URL = "https://ff-servidor-oculto.onrender.com/patch";

function addLog(t, cls=""){
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
    closeBtn.style.display = "none"; // Esconde o botão durante o processo
    log.innerHTML = "";
    
    // Log inicial "fake" imediato
    addLog("CONECTANDO AO SISTEMA...", "log-step-1");
    
    const etapas = [
        { msg: "Iniciando injeção de skins...", cls: "log-step-1" },
        { msg: "Verificando arquivos do mapa...", cls: "log-step-2" },
        { msg: "Desbloqueando slots de skins...", cls: "log-step-3" },
        { msg: "Injetando pacotes de texturas...", cls: "log-step-4" },
        { msg: "Validando integridade dos blocos...", cls: "log-step-5" },
        { msg: "Aplicando modificações...", cls: "log-step-6" },
        { msg: "Finalizando processo...", cls: "log-step-7" }
    ];
    
    let msgIndex = 0;
    const logInterval = setInterval(() => {
        if (msgIndex < etapas.length) {
            addLog(etapas[msgIndex].msg, etapas[msgIndex].cls);
            msgIndex++;
        }
    }, 2000);

    const formData = new FormData();
    formData.append("mapa", file);

    try {
        const response = await fetch(API_URL, { method: "POST", body: formData });
        clearInterval(logInterval);

        if (!response.ok) throw new Error("Erro no servidor.");

        addLog("PROCESSANDO MAPA E INJETANDO ALTERAÇÕES...", "success");
        const blob = await response.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `patched_${Date.now()}.zip`;
        a.click();

        addLog("CONCLUÍDO COM SUCESSO! SUAS SKINS FOI APLICADAS.", "success");
    } catch (e) {
        clearInterval(logInterval);
        addLog(`FALHA: ${e.message}`, "fail");
    } finally {
        patchBtn.disabled = false;
        closeBtn.style.display = "block"; // Libera o botão de fechar ao finalizar
    }
};
