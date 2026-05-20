// ======================================================
// ELEMENTS
// ======================================================
const zipInput = document.getElementById("zipInput");
const patchBtn = document.getElementById("patchBtn");
const uidContainer = document.getElementById("uidContainer");
const log = document.getElementById("log");

let parsedZip = null;
let uidGroups = {};
let validSlots = {};

// ======================================================
// RULES
// ======================================================
const markerRules = [
    { name:"Conjunto Completo (Set)", from:-10001, to:-269001 },
    { name:"Cabelo", from:-10001, to:-269002 },
    { name:"Acessório de Cabeça/Máscara", from:-10001, to:-269003 },
    { name:"Rosto/Maquiagem", from:-10001, to:-269004 },
    { name:"Peitoral/Camisa", from:-10001, to:-269005 },
    { name:"Calça/Bermuda", from:-10001, to:-269006 },
    { name:"Calçado/Tênis", from:-10001, to:-269007 },
    { name:"Skins de Arma (wSkin)", from:-10001, to:-14056 },
    { name:"Skin de Mochila (bSkin)", from:-10001, to:-14075 }
];

// ======================================================
// LOG (Sistema Multi-cores atualizado)
// ======================================================
function addLog(t, cls="info"){
    log.innerHTML += `<div class="${cls}">➜ ${t}</div>`;
    log.scrollTop = log.scrollHeight;
}

// ======================================================
// STRING TO HEX
// ======================================================
function stringToHex(str){
    return Array.from(str).map(c=>c.charCodeAt(0).toString(16).padStart(2,"0")).join(" ");
}

// ======================================================
// SIGNED VARINT64
// ======================================================
function encodeSignedVarint64(num){
    let value = BigInt.asUintN(64, BigInt(num));
    const out = [];
    while(value >= 0x80n){
        out.push(Number((value & 0x7Fn) | 0x80n));
        value >>= 7n;
    }
    out.push(Number(value));
    return out.map(v=>v.toString(16).padStart(2,"0")).join(" ");
}

// ======================================================
// PATCHES
// ======================================================
const markerRulesOriginalNames = [
    "SetID", "HairID", "HeadAdditiveID", "FaceID", "ChestID", "LegsID", "FeetID", "wSkinIDs", "bSkinID"
];

const markerPatches = markerRules.map((r, index)=>({
    name:r.name,
    marker: stringToHex(markerRulesOriginalNames[index]),
    search: "88 01 " + encodeSignedVarint64(r.from),
    replace: "88 01 " + encodeSignedVarint64(r.to)
}));

// ======================================================
// HEX
// ======================================================
function hexToBytes(hex){
    return hex.trim().split(/\s+/).map(x=>parseInt(x,16));
}

// ======================================================
// FIND PATTERN
// ======================================================
function findPattern(data, pattern, start=0){
    for(let i=start; i<=data.length-pattern.length; i++){
        let ok = true;
        for(let j=0; j<pattern.length; j++){
            if(data[i+j] !== pattern[j]){
                ok = false;
                break;
            }
        }
        if(ok) return i;
    }
    return -1;
}

// ======================================================
// REPLACE BYTES
// ======================================================
function replaceBytes(data, oldBytes, newBytes){
    const pos = findPattern(data, Array.from(oldBytes));
    if(pos === -1) return data;
    const before = Array.from(data.slice(0,pos));
    const after = Array.from(data.slice(pos + oldBytes.length));
    return new Uint8Array([...before, ...newBytes, ...after]);
}

// ======================================================
// MD5
// ======================================================
function md5Bytes(buffer){
    const hex = SparkMD5.ArrayBuffer.hash(buffer);
    const out = new Uint8Array(16);
    for(let i=0;i<16;i++){
        out[i] = parseInt(hex.substr(i*2,2), 16);
    }
    return out;
}

// ======================================================
// VARINT
// ======================================================
function readVarint(data,pos){
    let result = 0n;
    let shift = 0n;
    let start = pos;
    while(true){
        const b = BigInt(data[pos]);
        pos++;
        result |= (b & 0x7Fn) << shift;
        if((b & 0x80n) === 0n) break;
        shift += 7n;
    }
    return [result, pos, data.slice(start,pos)];
}

function encodeVarint(value){
    let n = BigInt(value);
    const out = [];
    while(n >= 0x80n){
        out.push(Number((n & 0x7Fn) | 0x80n));
        n >>= 7n;
    }
    out.push(Number(n));
    return new Uint8Array(out);
}

// ======================================================
// UID INFO
// ======================================================
function getUidInfo(data){
    let pos = 0;
    while(pos < data.length){
        const [tag,p1] = readVarint(data,pos);
        pos = p1;
        const field = Number(tag >> 3n);
        const wire = Number(tag & 7n);
        if(wire === 0){
            const [value, p2, raw] = readVarint(data,pos);
            pos = p2;
            if(field === 7){
                return { uid: value.toString(), raw };
            }
        }
        else if(wire === 1){ pos += 8; }
        else if(wire === 2){
            const [len,p2] = readVarint(data,pos);
            pos = p2 + Number(len);
        }
        else if(wire === 5){ pos += 4; }
        else { break; }
    }
    return null;
}

// ======================================================
// PATCH USERLEVEL
// ======================================================
function patchByMarker(data,p){
    const marker = hexToBytes(p.marker);
    const search = hexToBytes(p.search);
    const replace = hexToBytes(p.replace);
    let pos = 0;

    while(true){
        const found = findPattern(data, search, pos);
        if(found === -1) break;
        const markerPos = found + search.length + 94;
        if(markerPos + marker.length > data.length){
            pos = found + 1;
            continue;
        }
        let ok = true;
        for(let i=0; i<marker.length; i++){
            if(data[markerPos+i] !== marker[i]){
                ok = false;
                break;
            }
        }
        if(ok){
            for(let i=0; i<replace.length; i++){
                data[found+i] = replace[i];
            }
            
            // Separação de cores por tipo de item modificado
            if (p.name.includes("Arma") || p.name.includes("Mochila")) {
                addLog(`MODIFICADO: ${p.name}`, "item-equip"); // Amarelo Neon
            } else {
                addLog(`MODIFICADO: ${p.name}`, "item-clothing"); // Roxo Neon
            }
            break;
        }
        pos = found + 1;
    }
}

// ======================================================
// ZIP LOAD
// ======================================================
zipInput.addEventListener("change", async ()=>{
    log.innerHTML = "";
    uidContainer.innerHTML = "";
    uidGroups = {};
    validSlots = {};
    patchBtn.disabled = true;

    const file = zipInput.files[0];
    if(!file) return;

    if(!file.name.toLowerCase().endsWith(".zip")){
        addLog("ERRO: APENAS ARQUIVOS .ZIP SÃO SUPORTADOS", "fail");
        return;
    }

    let zipBuffer;
    try {
        zipBuffer = await file.arrayBuffer();
    } catch(e) {
        addLog("FALHA CRÍTICA AO LER O ARQUIVO DO MAPA", "fail");
        return;
    }

    try {
        parsedZip = await JSZip.loadAsync(zipBuffer);
    } catch(e) {
        addLog("ARQUIVO ZIP INVÁLIDO OU CORROMPIDO", "fail");
        return;
    }

    addLog("MAPA CARREGADO COM SUCESSO!", "info");

    const slots = {};
    Object.keys(parsedZip.files).forEach(name=>{
        let m = name.match(/(?:^|\/)ProjectData_slot_(\d+)\.bytes$/i);
        if(m){
            if(!slots[m[1]]) slots[m[1]] = {};
            slots[m[1]].pbytes = name;
        }
        m = name.match(/(?:^|\/)ProjectData_slot_(\d+)\.meta$/i);
        if(m){
            if(!slots[m[1]]) slots[m[1]] = {};
            slots[m[1]].meta = name;
        }
        m = name.match(/(?:^|\/)UserLevelData_(\d+)\.bytes$/i);
        if(m){
            if(!slots[m[1]]) slots[m[1]] = {};
            slots[m[1]].ul = name;
        }
    });

    for(const slot in slots){
        const s = slots[slot];
        if(!s.ul || !s.meta || !s.pbytes){
            const missing = [];
            if(!s.ul) missing.push(`UserLevelData_${slot}.bytes`);
            if(!s.meta) missing.push(`ProjectData_slot_${slot}.meta`);
            if(!s.pbytes) missing.push(`ProjectData_slot_${slot}.bytes`);
            addLog(`PULANDO SLOT ${slot} — ARQUIVOS AUSENTES: ${missing.join(", ")}`, "fail");
            continue;
        }

        let buffer;
        try {
            buffer = await parsedZip.file(s.pbytes).async("arraybuffer");
        } catch(e) {
            addLog(`ERRO DE LEITURA NO SLOT ${slot}`, "fail");
            continue;
        }

        const info = getUidInfo(new Uint8Array(buffer));
        if(!info){
            addLog(`FALHA AO EXTRAIR UID DO SLOT ${slot}`, "fail");
            continue;
        }

        const uid = info.uid;
        if(!uidGroups[uid]) uidGroups[uid] = [];
        uidGroups[uid].push(slot);
        validSlots[slot] = s;

        addLog(`SLOT ${slot} VERIFICADO [OK]`, "info");
    }

    if(Object.keys(validSlots).length === 0){
        addLog("NENHUM SLOT VÁLIDO ENCONTRADO NO MAPA", "fail");
        return;
    }

    Object.keys(uidGroups).forEach(uid=>{
        const div = document.createElement("div");
        div.className = "uid-group";
        div.innerHTML = `
        <label>Slots Detectados: ${uidGroups[uid].join(",")}</label>
        <input type="text" value="${uid}" data-old="${uid}">
        `;
        uidContainer.appendChild(div);
    });

    patchBtn.disabled = false;
    addLog("SISTEMA PRONTO PARA ATIVAÇÃO", "info");
});

// ======================================================
// MAIN PATCH
// ======================================================
patchBtn.onclick = async ()=>{
    try {
        log.innerHTML = "";
        addLog("INICIANDO PROCEDIMENTO DE INJEÇÃO...", "info");

        const outZip = new JSZip();
        const inputs = uidContainer.querySelectorAll("input");
        const uidMap = {};

        inputs.forEach(i=>{
            const value = i.value.trim();
            if(!/^\d+$/.test(value)){
                addLog(`UID INVÁLIDO: ${value}`, "fail");
                throw new Error("INVALID UID");
            }
            uidMap[i.dataset.old] = value;
        });

        for(const slot in validSlots){
            const s = validSlots[slot];
            addLog(`PROCESSANDO SLOT DE MAPA: ${slot}`, "info");

            const oldUlBuffer = await parsedZip.file(s.ul).async("arraybuffer");
            let ulData = new Uint8Array(oldUlBuffer);
            const oldUlMd5 = md5Bytes(oldUlBuffer);

            markerPatches.forEach(p=>{
                patchByMarker(ulData, p);
            });

            const newUlMd5 = md5Bytes(ulData.buffer);
            const oldPBuffer = await parsedZip.file(s.pbytes).async("arraybuffer");
            let pData = new Uint8Array(oldPBuffer);
            const oldPSize = pData.length;
            const oldPMd5 = md5Bytes(oldPBuffer);

            const uidInfo = getUidInfo(pData);
            if(uidInfo){
                const oldUid = uidInfo.uid;
                const newUid = uidMap[oldUid];

                if(newUid && newUid !== oldUid){
                    const newVarint = encodeVarint(newUid);
                    pData = replaceBytes(pData, uidInfo.raw, newVarint);
                    addLog(`VÍNCULO DE ID ATUALIZADO: ${oldUid} → ${newUid}`, "id-update"); // Ciano Neon
                }
            }

            const newPSize = pData.length;
            const newPMd5 = md5Bytes(pData.buffer);
            const metaBuffer = await parsedZip.file(s.meta).async("arraybuffer");
            let metaData = new Uint8Array(metaBuffer);

            metaData = replaceBytes(metaData, oldUlMd5, newUlMd5);

            if(uidInfo){
                const oldUid = uidInfo.uid;
                const newUid = uidMap[oldUid];

                if(newUid && newUid !== oldUid){
                    metaData = replaceBytes(metaData, encodeVarint(oldUid), encodeVarint(newUid));
                    metaData = replaceBytes(metaData, encodeVarint(oldPSize), encodeVarint(newPSize));
                    metaData = replaceBytes(metaData, oldPMd5, newPMd5);
                    addLog("ARQUIVOS METADATA ATUALIZADOS", "metadata"); // Cinza Claro
                }
            }

            outZip.file(s.ul, ulData);
            outZip.file(s.pbytes, pData);
            outZip.file(s.meta, metaData);
        }

        addLog("COMPACTANDO NOVOS ARQUIVOS...", "info");

        const finalZip = await outZip.generateAsync({ type:"blob" });
        const timestamp = Date.now();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(finalZip);
        a.download = `patched_${timestamp}.zip`;
        a.click();

        addLog("CONCLUÍDO COM SUCESSO! SEU MAPA ATUALIZADO FOI BAIXADO.", "success"); // Verde Neon

    } catch(e) {
        addLog(`ERRO INTERNO: ${e.message}`, "fail");
        console.error(e);
    }
};
