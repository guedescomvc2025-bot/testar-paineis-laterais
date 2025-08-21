const m3uInput = document.getElementById("m3uInput");
const speedSelect = document.getElementById("speedSelect");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const progressDiv = document.getElementById("progress");
const validListDiv = document.getElementById("validList");
const checkM3UBtn = document.getElementById("checkM3UBtn");
let validServers = [];
let testedServers = 0;
let totalServers = 0;
let username = "";
let password = "";
let hostname = "";
let hostnameDomain = ""; // domínio sem porta para título
let isRunning = false;

function extrairUserPass(url) {
  try {
    const u = new URL(url);
    const user = u.searchParams.get("username");
    const pass = u.searchParams.get("password");
    if (user && pass) return { user, pass, hostname: u.host }; // use host para manter porta se houver
    return null;
  } catch {
    return null;
  }
}

async function lerServidoresDoLink() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/guedescomvc2025-bot/dnscheker/main/DNSCHECKER.txt");
    if (!response.ok) {
      throw new Error(`Erro ao carregar servidores: ${response.status}`);
    }
    const text = await response.text();
    const linhas = text.split(/\r?\n/);
    const servidoresSet = new Set();
    
    for (let linha of linhas) {
      linha = linha.trim().replace(/[= ]+$/, "");
      if (!linha) continue;
      if (!/^https?:\/\//i.test(linha)) {
        linha = "http://" + linha;
      }
      servidoresSet.add(linha);
    }
    
    return Array.from(servidoresSet);
  } catch (error) {
    console.error("Erro ao carregar lista de servidores:", error);
    alert("Não foi possível carregar a lista de servidores. Tente novamente mais tarde.");
    return [];
  }
}

async function testarServidor(servidor, user, pass) {
  const url = `${servidor.replace(/\/+$/, "")}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-cache"
    });
    if (!resp.ok) return false;
    const json = await resp.json();
    if (json.user_info && json.user_info.status === "Active") {
      const ts = parseInt(json.user_info.exp_date);
      if (!isNaN(ts)) {
        const dt = new Date(ts * 1000);
        return dt.toISOString().slice(0, 19).replace("T", " ");
      }
      return "Data não disponível";
    }
    return false;
  } catch {
    return false;
  }
}

function montarLinkM3U(server, user, pass) {
  return `${server.replace(/\/+$/, "")}/get.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&type=m3u_plus`;
}

function extrairDominio(hostnameWithPort) {
  // hostnameWithPort pode ser tipo bpbe.one:80, precisa extrair só domínio sem porta
  // Exemplo bpbe.one:80 -> bpbe.one; bpbe.one -> bpbe.one.
  return hostnameWithPort.split(":")[0];
}

function atualizarListaValidos() {
  hostnameDomain = extrairDominio(hostname);
  
  let texto = `🤖 BOT PAINÉIS LATERAIS 🤖\n`;
  texto += `NOME DO SERVIDOR DO LINK M3U FORNECIDO: ${hostnameDomain}\n`;
  texto += `👤Usuário: ${username}\n`;
  texto += `🔐Senha: ${password}\n\n`;
  texto += `Painéis válidos: COM MESMO USUÁRIO E SENHA\n\n`;
  validServers.forEach((obj, i) => {
    const baseURL = obj.server; // exemplo: http://bpbe.one:80
    const linkCompleto = montarLinkM3U(baseURL, username, password);
    texto += `🌐PAINEL ${i + 1}: ${baseURL}  |  📆Expira: ${obj.expDate}\n`;
    texto += `👤Usuário: ${username} | 🔐Senha: ${password}\n`;
    texto += `🔗link m3u: ${linkCompleto}\n`;
  });
  validListDiv.textContent = texto;
  if (validServers.length > 0) {
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    downloadBtn.style.display = "inline-block";
  } else {
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    downloadBtn.style.display = "none";
  }
}

function copiarResultado() {
  hostnameDomain = extrairDominio(hostname);
  
  let texto = `🤖 BOT PAINÉIS LATERAIS 🤖\n`;
  texto += `NOME DO SERVIDOR DO LINK M3U FORNECIDO: ${hostnameDomain}\n`;
  texto += `👤Usuário: ${username}\n`;
  texto += `🔐Senha: ${password}\n\n`;
  texto += `Painéis válidos: COM MESMO USUÁRIO E SENHA\n\n`;
  validServers.forEach((obj, i) => {
    const baseURL = obj.server;
    const linkCompleto = montarLinkM3U(baseURL, username, password);
    texto += `🌐PAINEL ${i + 1}: ${baseURL}  |  📆Expira: ${obj.expDate}\n`;
    texto += `👤Usuário: ${username} | 🔐Senha: ${password}\n`;
    texto += `🔗link m3u: ${linkCompleto}\n`;
  });
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texto)
      .then(() => alert("Resultado copiado para a área de transferência!"))
      .catch(() => fallbackCopyText(texto));
  } else {
    fallbackCopyText(texto);
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    alert("Resultado copiado para a área de transferência! (Método alternativo)");
  } catch {
    alert("Erro ao copiar resultado. Por favor, copie manualmente do campo de resultados.");
  }
  document.body.removeChild(textarea);
}

function baixarResultado() {
  const blob = new Blob([validListDiv.textContent], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "resultado_paineis_validos.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function verificarM3U(url) {
  checkM3UBtn.disabled = true;
  checkM3UBtn.textContent = "Verificando...";
  checkM3UBtn.classList.add("checking");
  const info = extrairUserPass(url);
  if (!info) {
    alert("URL M3U inválida ou faltando usuário/senha.");
    checkM3UBtn.disabled = false;
    checkM3UBtn.textContent = "Verificar M3U";
    checkM3UBtn.classList.remove("checking");
    checkM3UBtn.classList.remove("active", "inactive");
    return;
  }
  try {
    const teste = await testarServidor(`http://${info.hostname}`, info.user, info.pass);
    if (teste) {
      alert(`M3U ATIVO - Expira em: ${teste}`);
      checkM3UBtn.classList.add("active");
      checkM3UBtn.classList.remove("inactive");
    } else {
      alert("M3U INATIVO ou erro na resposta.");
      checkM3UBtn.classList.add("inactive");
      checkM3UBtn.classList.remove("active");
    }
  } catch {
    alert("Erro ao verificar M3U.");
    checkM3UBtn.classList.add("inactive");
    checkM3UBtn.classList.remove("active");
  }
  checkM3UBtn.disabled = false;
  checkM3UBtn.textContent = "Verificar M3U";
  checkM3UBtn.classList.remove("checking");
}

async function iniciarTeste() {
  if (isRunning) return;
  
  const m3uUrl = m3uInput.value.trim();
  if (!m3uUrl) {
    alert("Informe o link M3U contendo usuário e senha.");
    return;
  }
  const info = extrairUserPass(m3uUrl);
  if (!info) {
    alert("URL M3U inválida ou faltando usuário/senha.");
    return;
  }
  username = info.user;
  password = info.pass;
  hostname = info.hostname; // pode conter porta
  validServers = [];
  testedServers = 0;
  totalServers = 0;
  isRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  validListDiv.textContent = "";
  progressDiv.textContent = "Carregando lista de servidores...";
  
  const servidores = await lerServidoresDoLink();
  totalServers = servidores.length;
  if (totalServers === 0) {
    alert("Nenhum servidor válido encontrado na lista.");
    resetUI();
    return;
  }
  progressDiv.textContent = `Testando 0/${totalServers} servidores...`;
  const concorrencia = parseInt(speedSelect.value, 10) || 10;
  let index = 0;
  async function worker() {
    while (index < totalServers && isRunning) {
      const i = index++;
      const server = servidores[i];
      const expDate = await testarServidor(server, username, password);
      testedServers++;
      if (expDate) {
        validServers.push({ server, expDate });
      }
      progressDiv.textContent = `Testados: ${testedServers}/${totalServers} | Válidos: ${validServers.length}`;
      atualizarListaValidos();
      if (!isRunning) break;
    }
  }
  const workers = [];
  for (let i = 0; i < concorrencia; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  if (isRunning) {
    progressDiv.textContent = `Teste concluído! Testados: ${testedServers}/${totalServers} | Válidos: ${validServers.length}`;
  } else {
    progressDiv.textContent = `Teste interrompido pelo usuário. Testados: ${testedServers}/${totalServers} | Válidos: ${validServers.length}`;
  }
  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

function pararTeste() {
  if (!isRunning) return;
  isRunning = false;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  progressDiv.textContent += " (Parando...)";
}

function resetUI() {
  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  progressDiv.textContent = "";
  validListDiv.textContent = "";
  validServers = [];
  testedServers = 0;
  totalServers = 0;
}

startBtn.addEventListener("click", iniciarTeste);
stopBtn.addEventListener("click", pararTeste);
copyBtn.addEventListener("click", copiarResultado);
downloadBtn.addEventListener("click", baixarResultado);
checkM3UBtn.addEventListener("click", () => {
  const url = m3uInput.value.trim();
  if (!url) {
    alert("Informe um link M3U para verificar.");
    return;
  }
  verificarM3U(url);
});