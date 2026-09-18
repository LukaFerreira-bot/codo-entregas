// ---------- Bairros e taxas ----------
const TAXA_5 = [
  "Centro",
  "Santa Filomena",
  "Santo Antônio",
  "São Sebastião",
  "São Pedro",
];
const BAIRROS = [
  "Centro",
  "Codó Novo",
  "Eco Ville",
  "Nova Jerusalém",
  "Novo Milênio",
  "Residencial Santa Rita",
  "Residencial São Pedro",
  "Residencial Trizidela",
  "Santa Filomena",
  "Santa Teresinha",
  "Santo Antônio",
  "São Benedito",
  "São Francisco",
  "São José",
  "São Pedro",
  "São Raimundo",
  "São Sebastião",
  "São Vicente Palotti",
]; // já em ordem alfabética

function taxaDoBairro(bairro) {
  return TAXA_5.includes(bairro) ? 5 : 7;
}

function popularBairros() {
  const select = document.getElementById("bairro");
  BAIRROS.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    select.appendChild(opt);
  });
}
popularBairros();

function mostrarTaxaSelecionada() {
  const bairro = document.getElementById("bairro").value;
  const hint = document.getElementById("taxa-hint");
  if (!bairro) {
    hint.innerHTML = "Escolha o bairro para ver a taxa.";
    return;
  }
  hint.innerHTML = `Taxa da entrega: <span class="valor">R$ ${taxaDoBairro(bairro)}</span>`;
}

// ---------- Estado em memória (sem localStorage: não suportado neste ambiente) ----------
let usuario = null;
let entregas = []; // {data:'YYYY-MM-DD', cliente, bairro, valor}
let filtroAtivo = "dia";
let grafico = null;

// ---------- Login / navegação de página ----------
function fazerLogin() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const erro = document.getElementById("login-error");
  // Protótipo: esta em fase de testes então deixar vazio para facilitar o acesso.
  if (user || pass) {
    erro.textContent = "Preencha e-mail/nome e senha para continuar.";
    return;
  }
  erro.textContent = "";
  usuario = user;
  document.getElementById("who-name").textContent = user;
  document.getElementById("view-login").style.display = "none";
  document.getElementById("view-app").classList.add("active");
  atualizarDashboard();
}

function sair() {
  usuario = null;
  document.getElementById("login-pass").value = "";
  document.getElementById("view-app").classList.remove("active");
  document.getElementById("view-login").style.display = "flex";
}

// ---------- Formulário ----------
function confirmarEntrega() {
  const clienteInput = document.getElementById("cliente");
  const bairroSelect = document.getElementById("bairro");
  const cliente = clienteInput.value.trim();
  const bairro = bairroSelect.value;

  if (!cliente) {
    alert("Informe o nome do cliente.");
    return;
  }
  if (!bairro) {
    alert("Escolha um bairro antes de confirmar.");
    return;
  }

  const hoje = new Date();
  const dataStr = hoje.toISOString().slice(0, 10);
  const valor = taxaDoBairro(bairro);

  entregas.push({ data: dataStr, cliente, bairro, valor });

  clienteInput.value = "";
  bairroSelect.value = "";
  mostrarTaxaSelecionada();
  mostrarToast();
  atualizarDashboard();
}

function mostrarToast() {
  const t = document.getElementById("toast-form");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1600);
}

// ---------- Dashboard: agrupamento ----------
function getWeekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-S${week}`;
}
function getMonthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}
function formatarDataCurta(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
function nomeDiaSemana(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}
function formatarReais(v) {
  return `R$ ${Number(v).toFixed(0)}`;
}

function setFiltro(f) {
  filtroAtivo = f;
  document
    .querySelectorAll(".filter-tab")
    .forEach((b) => b.classList.toggle("active", b.dataset.f === f));
  atualizarDashboard();
}

// Agrupa por chave (dia/semana/mês), somando quantidade de entregas e valor total
function agruparPorChave(keyFn) {
  const grupos = {};
  entregas.forEach((item) => {
    const k = keyFn(item.data);
    if (!grupos[k]) grupos[k] = { quantidade: 0, valor: 0 };
    grupos[k].quantidade += 1;
    grupos[k].valor += Number(item.valor);
  });
  return grupos;
}

function media(lista, campo) {
  if (!lista.length) return 0;
  return lista.reduce((s, g) => s + g[campo], 0) / lista.length;
}

function atualizarPill(pillId, atual, med) {
  const pill = document.getElementById(pillId);
  if (med > 0) {
    const delta = ((atual - med) / med) * 100;
    if (Math.abs(delta) < 1) {
      pill.textContent = "estável";
      pill.className = "delta-pill delta-flat";
    } else if (delta > 0) {
      pill.textContent = `▲ ${delta.toFixed(0)}%`;
      pill.className = "delta-pill delta-up";
    } else {
      pill.textContent = `▼ ${Math.abs(delta).toFixed(0)}%`;
      pill.className = "delta-pill delta-down";
    }
  } else {
    pill.textContent = "—";
    pill.className = "delta-pill delta-flat";
  }
}

function atualizarDashboard() {
  const nota = document.getElementById("compare-note");

  if (entregas.length === 0) {
    renderGrafico([], [], []);
    document.getElementById("compare-label-atual-qtd").textContent =
      "Período atual";
    document.getElementById("compare-label-atual-valor").textContent =
      "Período atual";
    document.getElementById("compare-atual-qtd").textContent = "0";
    document.getElementById("compare-media-qtd").textContent = "0";
    document.getElementById("compare-atual-valor").textContent = "R$ 0";
    document.getElementById("compare-media-valor").textContent = "R$ 0";
    atualizarPill("delta-pill-qtd", 0, 0);
    atualizarPill("delta-pill-valor", 0, 0);
    nota.textContent = "Registre entregas para ver a comparação.";
    renderHistorico();
    return;
  }

  let labels = [],
    qtdSerie = [],
    valorSerie = [];
  let atualQtd = 0,
    medQtd = 0,
    atualValor = 0,
    medValor = 0;
  let labelAtual = "Período atual",
    notaTxt = "";

  if (filtroAtivo === "dia") {
    const grupos = agruparPorChave((d) => d);
    const chaves = Object.keys(grupos).sort();
    labels = chaves.map(formatarDataCurta);
    qtdSerie = chaves.map((k) => grupos[k].quantidade);
    valorSerie = chaves.map((k) => grupos[k].valor);

    const chaveAtual = chaves[chaves.length - 1];
    atualQtd = grupos[chaveAtual].quantidade;
    atualValor = grupos[chaveAtual].valor;
    const diaSemanaAtual = nomeDiaSemana(chaveAtual);
    const mesmoDiaSemana = chaves.filter(
      (k) => k !== chaveAtual && nomeDiaSemana(k) === diaSemanaAtual,
    );
    const baseChaves = mesmoDiaSemana.length
      ? mesmoDiaSemana
      : chaves.filter((k) => k !== chaveAtual);
    const base = baseChaves.map((k) => grupos[k]);
    medQtd = media(base, "quantidade");
    medValor = media(base, "valor");

    labelAtual = `Hoje (${diaSemanaAtual})`;
    notaTxt = mesmoDiaSemana.length
      ? `Comparado com a média de outras ${diaSemanaAtual}s registradas.`
      : "Comparado com a média dos demais dias registrados.";
  } else if (filtroAtivo === "semana") {
    const grupos = agruparPorChave(getWeekKey);
    const chaves = Object.keys(grupos).sort();
    labels = chaves;
    qtdSerie = chaves.map((k) => grupos[k].quantidade);
    valorSerie = chaves.map((k) => grupos[k].valor);

    const chaveAtual = chaves[chaves.length - 1];
    atualQtd = grupos[chaveAtual].quantidade;
    atualValor = grupos[chaveAtual].valor;
    const outras = chaves.filter((k) => k !== chaveAtual).map((k) => grupos[k]);
    medQtd = media(outras, "quantidade");
    medValor = media(outras, "valor");

    labelAtual = "Semana atual";
    notaTxt = outras.length
      ? "Comparado com a média das semanas anteriores."
      : "Ainda não há semanas anteriores para comparar.";
  } else {
    const grupos = agruparPorChave(getMonthKey);
    const chaves = Object.keys(grupos).sort();
    labels = chaves.map((k) => {
      const [ano, mes] = k.split("-");
      return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
        month: "short",
      });
    });
    qtdSerie = chaves.map((k) => grupos[k].quantidade);
    valorSerie = chaves.map((k) => grupos[k].valor);

    const chaveAtual = chaves[chaves.length - 1];
    atualQtd = grupos[chaveAtual].quantidade;
    atualValor = grupos[chaveAtual].valor;
    const outras = chaves.filter((k) => k !== chaveAtual).map((k) => grupos[k]);
    medQtd = media(outras, "quantidade");
    medValor = media(outras, "valor");

    labelAtual = "Mês atual";
    notaTxt = outras.length
      ? "Comparado com a média dos meses anteriores."
      : "Ainda não há meses anteriores para comparar.";
  }

  document.getElementById("compare-label-atual-qtd").textContent = labelAtual;
  document.getElementById("compare-label-atual-valor").textContent = labelAtual;
  document.getElementById("compare-atual-qtd").textContent = atualQtd;
  document.getElementById("compare-media-qtd").textContent = medQtd.toFixed(1);
  document.getElementById("compare-atual-valor").textContent =
    formatarReais(atualValor);
  document.getElementById("compare-media-valor").textContent =
    formatarReais(medValor);
  atualizarPill("delta-pill-qtd", atualQtd, medQtd);
  atualizarPill("delta-pill-valor", atualValor, medValor);
  nota.textContent = notaTxt;

  renderGrafico(labels, qtdSerie, valorSerie);
  renderHistorico();
}

function renderGrafico(labels, qtdSerie, valorSerie) {
  const ctx = document.getElementById("grafico").getContext("2d");
  if (grafico) grafico.destroy();
  grafico = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          type: "bar",
          label: "Entregas",
          data: qtdSerie,
          backgroundColor: "#2E7D82",
          borderRadius: 4,
          maxBarThickness: 30,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Faturamento (R$)",
          data: valorSerie,
          borderColor: "#E8A33D",
          backgroundColor: "#E8A33D",
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: "#E8A33D",
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: "#6B7A82" },
        },
        y: {
          beginAtZero: true,
          position: "left",
          ticks: { font: { size: 10 }, color: "#6B7A82" },
          grid: { color: "rgba(18,51,71,0.06)" },
          title: {
            display: true,
            text: "Entregas",
            font: { size: 10 },
            color: "#6B7A82",
          },
        },
        y1: {
          beginAtZero: true,
          position: "right",
          ticks: { font: { size: 10 }, color: "#6B7A82" },
          grid: { display: false },
          title: {
            display: true,
            text: "R$",
            font: { size: 10 },
            color: "#6B7A82",
          },
        },
      },
    },
  });
}

function renderHistorico() {
  const wrap = document.getElementById("history-list");
  wrap.innerHTML = "";
  if (entregas.length === 0) {
    wrap.innerHTML =
      '<div class="empty-state">Nenhuma entrega registrada ainda.</div>';
    return;
  }
  const ultimos = [...entregas].slice(-8).reverse();
  ultimos.forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `
      <span>
        <div class="cliente">${item.cliente}</div>
        <div class="bairro">${item.bairro}</div>
      </span>
      <span class="meta">${formatarDataCurta(item.data)}<br><span class="valor">R$ ${item.valor}</span></span>
    `;
    wrap.appendChild(row);
  });
}
