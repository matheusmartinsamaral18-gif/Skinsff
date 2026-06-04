const zipInput = document.getElementById("zipInput");
const patchBtn = document.getElementById("patchBtn");
const uidContainer = document.getElementById("uidContainer");
const log = document.getElementById("log");


const API_URL = "https://ff-servidor-oculto.onrender.com/patch";

function addLog(t, cls="info"){
    log.innerHTML += `<div class="${cls}">➜ ${t}</div>`;
    log.scrollTop = log.scrollHeight;
}

// Ativa o botão assim que o usuário joga o arquivo
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

    const formData = new FormData();
    formData.append("mapa", file);

    try {
        // Envia o arquivo de forma oculta para a sua API na nuvem
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("O servidor recusou o arquivo ou encontrou um erro.");
        }

        addLog("PROCESSANDO MAPA E INJETANDO ALTERAÇÕES...", "info");

        // Recebe o arquivo modificado de volta do seu servidor
        const blob = await response.blob();
        const finalUrl = URL.createObjectURL(blob);
        
        const timestamp = Date.now();
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = `patched_${timestamp}.zip`;
        a.click();

        addLog("CONCLUÍDO COM SUCESSO! SEU MAPA FOI ATUALIZADO.", "success");

    } catch (e) {
        addLog(`FALHA NO SERVIDOR: ${e.message}`, "fail");
        console.error(e);
    } finally {
        patchBtn.disabled = false;
    }
};
