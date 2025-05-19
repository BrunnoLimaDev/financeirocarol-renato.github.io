let appData = {
  usuarios: [
    { usuario: "admin", senha: "1234", tipo: "admin" },
    { usuario: "financeiro", senha: "1234", tipo: "financeiro" },
    { usuario: "brunno", senha: "1234", tipo: "comum" },
    { usuario: "cauane", senha: "1234", tipo: "comum" },
    { usuario: "gabi", senha: "1234", tipo: "comum" },
    { usuario: "thiago", senha: "1234", tipo: "comum" },
    { usuario: "suely", senha: "1234", tipo: "comum" },
    { usuario: "geovana", senha: "1234", tipo: "comum" },
    { usuario: "lorena", senha: "1234", tipo: "comum" }
  ],
  equipes: {
    "brunno": "Bem Aventurados",
    "cauane": "Voz que Clama",
    "thiago": "Insaciáveis",
    "suely": "Obstinados",
    "geovana": "Sheepers",
    "lorena": "Maanaim",
    "felipe": "Estevans",
    "luana": "Estevans",
    "gabi": "Estevans"
  },
  valoresSemanais: {},
  theme: "light",
  github: {
    token: "",
    owner: "",
    repo: "",
    path: "dados.json",
    lastSync: null,
    isConfigured: false
  }
};

const GitHub = {
  init: () => {
    const savedConfig = localStorage.getItem('githubConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        State.github = { ...State.github, ...config };
        GitHub.updateSyncStatus(true);
      } catch (e) {
        console.error('Erro ao carregar configuração do GitHub:', e);
        GitHub.updateSyncStatus(false);
      }
    } else {
      GitHub.updateSyncStatus(false);
    }
  },
  showConfigModal: () => {
    const modal = document.getElementById("githubConfigModal");
    const form = document.getElementById("githubConfigForm");
    
    if (modal && form) {
      document.getElementById("githubToken").value = State.github.token || "";
      document.getElementById("githubOwner").value = State.github.owner || "";
      document.getElementById("githubRepo").value = State.github.repo || "";
      document.getElementById("githubPath").value = State.github.path || "dados.json";
      
      modal.style.display = "flex";
    }
  },
  closeConfigModal: () => {
    const modal = document.getElementById("githubConfigModal");
    if (modal) {
      modal.style.display = "none";
    }
  },
  saveConfig: (event) => {
    event.preventDefault();
    const token = document.getElementById("githubToken").value.trim();
    const owner = document.getElementById("githubOwner").value.trim();
    const repo = document.getElementById("githubRepo").value.trim();
    const path = document.getElementById("githubPath").value.trim() || "dados.json";
    
    if (!token || !owner || !repo) {
      UI.showMessage("mensagemGithub", "Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }
    
    State.github = {
      token,
      owner,
      repo,
      path,
      lastSync: null,
      isConfigured: true
    };
    
    localStorage.setItem('githubConfig', JSON.stringify(State.github));
    
    GitHub.testConnection().then(success => {
      if (success) {
        UI.showMessage("mensagemGithub", "Configuração salva com sucesso! Conexão estabelecida.", "success");
        GitHub.updateSyncStatus(true);
        GitHub.syncData();
      } else {
        UI.showMessage("mensagemGithub", "Configuração salva, mas não foi possível conectar. Verifique os dados.", "error");
        GitHub.updateSyncStatus(false);
      }
    });
  },
  testConnection: async () => {
    if (!State.github.isConfigured) return false;
    
    try {
      const response = await fetch(`https://api.github.com/repos/${State.github.owner}/${State.github.repo}`, {
        headers: {
          Authorization: `token ${State.github.token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Erro ao testar conexão com GitHub:', error);
      return false;
    }
  },
  updateSyncStatus: (isOnline) => {
    const status = document.getElementById("githubSyncStatus");
    if (status) {
      status.className = `github-sync-status ${isOnline ? 'online' : 'offline'}`;
      status.innerHTML = `<span class="github-sync-indicator ${isOnline ? 'online' : 'offline'}"></span>GitHub: ${isOnline ? 'Conectado' : 'Desconectado'}`;
    }
  },
  syncData: async () => {
    if (!State.github.isConfigured) {
      console.log('GitHub não configurado. Ignorando sincronização.');
      return;
    }
    
    try {
      const dataToSync = {
        usuarios: State.usuarios,
        equipes: State.equipes,
        valoresSemanais: State.valoresSemanais,
        theme: State.theme
      };
      
      let sha = null;
      try {
        const fileResponse = await fetch(`https://api.github.com/repos/${State.github.owner}/${State.github.repo}/contents/${State.github.path}`, {
          headers: {
            Authorization: `token ${State.github.token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        });
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          sha = fileData.sha;
        }
      } catch (e) {
        console.log('Arquivo não encontrado, será criado um novo.');
      }
      
      const content = btoa(JSON.stringify(dataToSync, null, 2));
      
      const requestBody = {
        message: `Atualização automática dos dados em ${new Date().toISOString()}`,
        content,
        ...(sha ? { sha } : {})
      };
      
      const response = await fetch(`https://api.github.com/repos/${State.github.owner}/${State.github.repo}/contents/${State.github.path}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${State.github.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        console.log('Dados sincronizados com GitHub com sucesso.');
        State.github.lastSync = new Date().toISOString();
        localStorage.setItem('githubConfig', JSON.stringify(State.github));
        GitHub.updateSyncStatus(true);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Erro ao sincronizar com GitHub:', errorData);
        GitHub.updateSyncStatus(false);
        return false;
      }
    } catch (error) {
      console.error('Erro ao sincronizar com GitHub:', error);
      GitHub.updateSyncStatus(false);
      return false;
    }
  },
  loadDataFromGitHub: async () => {
    if (!State.github.isConfigured) {
      console.log('GitHub não configurado. Ignorando carregamento.');
      return false;
    }
    
    try {
      const response = await fetch(`https://api.github.com/repos/${State.github.owner}/${State.github.repo}/contents/${State.github.path}`, {
        headers: {
          Authorization: `token ${State.github.token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const fileData = await response.json();
        const content = atob(fileData.content);
        const data = JSON.parse(content);
        
        State.usuarios = data.usuarios || State.usuarios;
        State.equipes = data.equipes || State.equipes;
        State.valoresSemanais = data.valoresSemanais || State.valoresSemanais;
        State.theme = data.theme || State.theme;
        
        Theme.init();
        
        console.log('Dados carregados do GitHub com sucesso.');
        GitHub.updateSyncStatus(true);
        return true;
      } else {
        console.log('Arquivo não encontrado no GitHub ou erro ao acessar.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do GitHub:', error);
      return false;
    }
  }
};

const Utils = {
  generateUUID: () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  ),
  debounce: (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },
  sanitizeInput: (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },
  validatePasswordStrength: (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const score = [minLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    return score >= 4 ? 'strong' : score >= 2 ? 'medium' : 'weak';
  },
  formatCurrency: (value) => `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`,
  formatDate: (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  getSemanaAtual: () => {
    const hoje = new Date();
    const dia = hoje.getDay();
    const domingo = new Date(hoje);
    domingo.setDate(hoje.getDate() - dia);
    const sabado = new Date(domingo);
    sabado.setDate(domingo.getDate() + 6);
    return `${Utils.formatDate(domingo)} a ${Utils.formatDate(sabado)}`;
  },
  isValidSemanaFormat: (semana) => {
    const regex = /^\d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(semana)) return false;
    const [start, end] = semana.split(' a ');
    const startDate = new Date(start.split('/').reverse().join('-'));
    const endDate = new Date(end.split('/').reverse().join('-'));
    return !isNaN(startDate) && !isNaN(endDate) && endDate > startDate;
  }
};

const State = {
  get usuarios() { return appData.usuarios; },
  set usuarios(value) { appData.usuarios = value; },
  get equipes() { return appData.equipes; },
  set equipes(value) { appData.equipes = value; },
  get valoresSemanais() { return appData.valoresSemanais; },
  set valoresSemanais(value) { appData.valoresSemanais = value; },
  get theme() { return appData.theme; },
  set theme(value) { appData.theme = value; },
  get github() { return appData.github; },
  set github(value) { appData.github = value; },
  usuarioLogado: null,
  sessionToken: null,
  saveAll: () => {
    try {
      localStorage.setItem('appData', JSON.stringify({
        usuarios: State.usuarios,
        equipes: State.equipes,
        valoresSemanais: State.valoresSemanais,
        theme: State.theme
      }));
      
      if (State.github.isConfigured) {
        GitHub.syncData()
          .then(success => {
            if (!success) {
              console.warn('Erro ao sincronizar com GitHub, mas os dados foram salvos localmente.');
            }
          })
          .catch(err => {
            console.error('Erro ao sincronizar com GitHub:', err);
          });
      }
      
      console.log('Dados salvos com sucesso');
    } catch (e) {
      console.error('Erro ao salvar dados:', e);
      UI.showMessage('mensagem', 'Erro ao salvar dados.', 'error');
    }
  },
  loadAll: () => {
    try {
      const savedData = localStorage.getItem('appData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        State.usuarios = parsedData.usuarios || State.usuarios;
        State.equipes = parsedData.equipes || State.equipes;
        State.valoresSemanais = parsedData.valoresSemanais || State.valoresSemanais;
        State.theme = parsedData.theme || State.theme;
      }
      
      if (State.github.isConfigured) {
        GitHub.loadDataFromGitHub()
          .then(success => {
            if (success) {
              console.log('Dados carregados do GitHub com sucesso.');
              if (State.usuarioLogado) {
                UserInterface.renderOptions(State.usuarioLogado);
              }
            }
          })
          .catch(err => {
            console.error('Erro ao carregar dados do GitHub:', err);
          });
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  }
};

const migrateData = () => {
  State.usuarios = State.usuarios.map(user => ({
    ...user,
    usuario: user.usuario.toLowerCase(),
    token: user.token || Utils.generateUUID()
  }));

  const newEquipes = {};
  for (const usuario in State.equipes) {
    newEquipes[usuario.toLowerCase()] = State.equipes[usuario];
  }
  State.equipes = newEquipes;

  const newValoresSemanais = {};
  for (const semana in State.valoresSemanais) {
    let newSemana = semana;
    if (semana.includes('-')) {
      const [startDate, endDate] = semana.split(' a ');
      const convertDate = (oldDateStr) => {
        const [year, month, day] = oldDateStr.split('-').map(Number);
        return Utils.formatDate(new Date(year, month - 1, day));
      };
      newSemana = `${convertDate(startDate)} a ${convertDate(endDate)}`;
    }
    newValoresSemanais[newSemana] = {};
    for (const usuario in State.valoresSemanais[semana]) {
      newValoresSemanais[newSemana][usuario.toLowerCase()] = State.valoresSemanais[semana][usuario];
    }
  }
  State.valoresSemanais = newValoresSemanais;

  for (const semana in State.valoresSemanais) {
    for (const usuario in State.valoresSemanais[semana]) {
      const data = State.valoresSemanais[semana][usuario];
      if (!Array.isArray(data)) {
        const valores = [];
        for (const subEquipe in data) {
          if (Array.isArray(data[subEquipe])) {
            valores.push(...data[subEquipe].map(v => ({ valor: v, observacao: "", comprovante: "" })));
          }
        }
        State.valoresSemanais[semana][usuario] = valores;
      } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'number') {
        State.valoresSemanais[semana][usuario] = data.map(v => ({ valor: v, observacao: "", comprovante: "" }));
      } else if (Array.isArray(data) && data.length > 0 && data[0].valor && !data[0].comprovante) {
        State.valoresSemanais[semana][usuario] = data.map(item => ({ ...item, comprovante: "" }));
      }
    }
  }

  State.saveAll();
};

const UI = {
  showMessage: (elementId, message, type) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerText = message;
      element.className = `${type}-message`;
      element.setAttribute('role', 'alert');
    }
  },
  setLoading: (element, isLoading) => {
    element.classList.toggle('loading', isLoading);
    element.disabled = isLoading;
  },
  updatePasswordStrength: Utils.debounce((inputId, strengthId) => {
    const input = document.getElementById(inputId);
    const strength = document.getElementById(strengthId);
    if (input && strength) {
      const strengthLevel = Utils.validatePasswordStrength(input.value);
      strength.textContent = `Força da senha: ${strengthLevel === 'strong' ? 'Forte' : strengthLevel === 'medium' ? 'Média' : 'Fraca'}`;
      strength.className = `password-strength ${strengthLevel}`;
    }
  }, 300)
};

const Modal = {
  openPreview: (comprovante) => {
    const modal = document.getElementById("previewModal");
    const previewContent = document.getElementById("previewContent");
    if (!modal || !previewContent) {
      UI.showMessage('mensagem', 'Erro interno: modal não encontrado.', 'error');
      return;
    }

    previewContent.innerHTML = "";
    if (comprovante.startsWith("data:image/")) {
      previewContent.innerHTML = `<img src="${comprovante}" alt="Visualização do comprovante" aria-describedby="modalTitle">`;
    } else if (comprovante.startsWith("data:application/pdf")) {
      previewContent.innerHTML = `<embed src="${comprovante}" type="application/pdf" width="100%" height="500px" aria-describedby="modalTitle">`;
    } else {
      previewContent.innerHTML = `<p>Erro: Formato de comprovante não suportado.</p>`;
    }

    modal.style.display = "flex";
    modal.focus();
  },
  closePreview: () => {
    const modal = document.getElementById("previewModal");
    const previewContent = document.getElementById("previewContent");
    if (modal && previewContent) {
      modal.style.display = "none";
      previewContent.innerHTML = "";
    }
  }
};

const Auth = {
  login: async (event) => {
    event.preventDefault();
    const loginInput = document.getElementById("login");
    const senhaInput = document.getElementById("senha");
    if (!loginInput || !senhaInput) {
      UI.showMessage('mensagem', 'Erro interno: campos de login não encontrados.', 'error');
      return;
    }

    const login = Utils.sanitizeInput(loginInput.value.trim().toLowerCase());
    const senha = senhaInput.value;
    UI.showMessage('mensagem', `Tentando login com usuário: ${login}`, 'success');

    if (!login || !senha) {
      UI.showMessage('mensagem', 'Por favor, preencha usuário e senha.', 'error');
      return;
    }

    const user = State.usuarios.find(u => u.usuario.toLowerCase() === login);
    if (!user) {
      UI.showMessage('mensagem', `Usuário "${login}" não encontrado.`, 'error');
      return;
    }

    if (user.senha !== senha) {
      UI.showMessage('mensagem', `Senha incorreta para "${login}".`, 'error');
      return;
    }

    State.usuarioLogado = user;
    State.sessionToken = user.token;
    document.getElementById("loginArea")?.classList.add("hidden");
    document.getElementById("areaUsuario")?.classList.remove("hidden");
    document.getElementById("boasVindas").innerText = `Bem-vindo, ${user.usuario}!`;
    UI.showMessage('mensagem', 'Login bem-sucedido!', 'success');
    UserInterface.renderOptions(user);
  },
  logout: () => {
    document.getElementById("loginArea")?.classList.remove("hidden");
    document.getElementById("areaUsuario")?.classList.add("hidden");
    State.usuarioLogado = null;
    State.sessionToken = null;
    document.getElementById("login").value = '';
    document.getElementById("senha").value = '';
    UI.showMessage('mensagem', 'Logout realizado com sucesso.', 'success');
  },
  verifyToken: (token) => State.sessionToken === token
};

const UserInterface = {
  renderOptions: (user) => {
    const opcoes = document.getElementById("opcoes");
    if (!opcoes) return;

    opcoes.innerHTML = "";
    const semanaAtual = Utils.getSemanaAtual();
    if (!State.valoresSemanais[semanaAtual]) State.valoresSemanais[semanaAtual] = {};

    if (user.tipo === "comum") {
      UserInterface.renderComum(user, semanaAtual, opcoes);
    } else if (user.tipo === "financeiro") {
      UserInterface.renderFinanceiro(semanaAtual, opcoes);
    } else if (user.tipo === "admin") {
      UserInterface.renderAdmin(opcoes);
    }
  },
  renderComum: (user, semanaAtual, opcoes) => {
    if (!State.valoresSemanais[semanaAtual][user.usuario]) {
      State.valoresSemanais[semanaAtual][user.usuario] = [];
    }
    const equipeUsuario = State.equipes[user.usuario] || user.usuario;
    opcoes.innerHTML = `
      <div class="section">
        <div class="flex-between">
          <h4><i class="fas fa-users"></i> Equipe: ${Utils.sanitizeInput(equipeUsuario)}</h4>
          <span class="card-value">${Utils.formatCurrency(State.valoresSemanais[semanaAtual][user.usuario].reduce((a, b) => a + b.valor, 0) || 0)}</span>
        </div>
        
        <form id="formAdicionarValor" aria-label="Adicionar novo valor" class="form-add-value">
          <div class="form-group">
            <label for="valorInput"><i class="fas fa-dollar-sign"></i> Valor</label>
            <input type="number" id="valorInput" placeholder="Digite um valor (R$)" step="0.01" min="0.01" autocomplete="off" required aria-label="Valor em reais">
          </div>
          <div class="form-group">
            <label for="observacaoInput"><i class="fas fa-comment"></i> Observação</label>
            <textarea id="observacaoInput" placeholder="Digite uma observação (opcional)" aria-label="Observação"></textarea>
          </div>
          <div class="form-group">
            <label for="comprovanteInput"><i class="fas fa-file-upload"></i> Comprovante</label>
            <input type="file" id="comprovanteInput" accept="image/*,application/pdf" title="Anexar Comprovante (opcional, máx. 5MB)" aria-label="Anexar comprovante">
          </div>
          <button type="submit" aria-label="Adicionar valor"><i class="fas fa-plus-circle"></i> Adicionar Valor</button>
        </form>
        <div id="mensagemValor" role="alert"></div>
      </div>
      <div class="section">
        <h4><i class="fas fa-list"></i> Valores Registrados</h4>
        <div id="listaValores" aria-live="polite"></div>
      </div>
    `;
    document.getElementById("formAdicionarValor").addEventListener("submit", Data.addValue);
    UserInterface.updateValueList(user.usuario);
  },
  renderFinanceiro: (semanaAtual, opcoes) => {
    const semanas = Object.keys(State.valoresSemanais).sort().reverse();
    
    const totalSemanaAtual = Object.values(State.valoresSemanais[semanaAtual] || {}).reduce((total, valores) => {
      return total + (Array.isArray(valores) ? valores.reduce((t, v) => t + v.valor, 0) : 0);
    }, 0);
    
    const equipesAtivas = new Set();
    const usuariosAtivos = new Set();
    
    Object.keys(State.valoresSemanais[semanaAtual] || {}).forEach(usuario => {
      usuariosAtivos.add(usuario);
      const equipe = State.equipes[usuario];
      if (equipe) equipesAtivas.add(equipe);
    });
    
    opcoes.innerHTML = `
      <div class="section">
        <div class="flex-between">
          <h4><i class="fas fa-chart-line"></i> Dashboard</h4>
          <button onclick="GitHub.showConfigModal()" class="btn-github-config" aria-label="Configurar GitHub">
            <i class="fab fa-github"></i> Configurar GitHub
          </button>
        </div>
        
        <div class="card-grid">
          <div class="card">
            <div class="card-title"><i class="fas fa-dollar-sign"></i> Total da Semana</div>
            <div class="card-value">${Utils.formatCurrency(totalSemanaAtual)}</div>
            <div class="card-footer">Semana atual: ${semanaAtual}</div>
          </div>
          <div class="card">
            <div class="card-title"><i class="fas fa-users"></i> Equipes Ativas</div>
            <div class="card-value">${equipesAtivas.size}</div>
            <div class="card-footer">Total de equipes: ${new Set(Object.values(State.equipes)).size}</div>
          </div>
          <div class="card">
            <div class="card-title"><i class="fas fa-user"></i> Usuários Ativos</div>
            <div class="card-value">${usuariosAtivos.size}</div>
            <div class="card-footer">Total de usuários: ${State.usuarios.filter(u => u.tipo === 'comum').length}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h4><i class="fas fa-calendar-alt"></i> Selecionar semana</h4>
        <div class="flex gap-4">
          <select id="semanasSelect" onchange="UserInterface.showWeekValues(this.value)" aria-label="Selecionar semana" class="semana-select">
            ${semanas.length > 0 ? semanas.map(s => `<option value="${s}" ${s === semanaAtual ? 'selected' : ''}>${s}</option>`).join("") : '<option value="">Nenhuma semana disponível</option>'}
          </select>
          <button onclick="Reports.generatePDF()" aria-label="Exportar relatório como PDF">
            <i class="fas fa-file-pdf"></i> Exportar PDF
          </button>
        </div>
      </div>
      
      <div class="section">
        <h4><i class="fas fa-table"></i> Relatório da Semana</h4>
        <div id="relatorioSemana" aria-live="polite"></div>
      </div>
    `;
    
    UserInterface.showWeekValues(semanaAtual);
  },
  renderAdmin: (opcoes) => {
    const equipeOptions = Object.values(State.equipes).filter((v, i, a) => a.indexOf(v) === i);
    
    const totalEquipes = new Set(Object.values(State.equipes)).size;
    const totalUsuarios = State.usuarios.length;
    const totalValores = Object.values(State.valoresSemanais).reduce((total, semana) => {
      return total + Object.values(semana).reduce((t, usuario) => {
        return t + (Array.isArray(usuario) ? usuario.length : 0);
      }, 0);
    }, 0);
    
    opcoes.innerHTML = `
      <div class="section">
        <div class="flex-between">
          <h4><i class="fas fa-chart-line"></i> Dashboard Admin</h4>
          <button onclick="GitHub.showConfigModal()" class="btn-github-config" aria-label="Configurar GitHub">
            <i class="fab fa-github"></i> Configurar GitHub
          </button>
        </div>
        
        <div class="card-grid">
          <div class="card">
            <div class="card-title"><i class="fas fa-users"></i> Total de Equipes</div>
            <div class="card-value">${totalEquipes}</div>
            <div class="card-footer">Gerenciar equipes</div>
          </div>
          <div class="card">
            <div class="card-title"><i class="fas fa-user"></i> Total de Usuários</div>
            <div class="card-value">${totalUsuarios}</div>
            <div class="card-footer">Administradores, financeiros e comuns</div>
          </div>
          <div class="card">
            <div class="card-title"><i class="fas fa-receipt"></i> Total de Valores</div>
            <div class="card-value">${totalValores}</div>
            <div class="card-footer">Valores registrados no sistema</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h4><i class="fas fa-plus-circle"></i> Criar Nova Equipe</h4>
        <form id="formCriarEquipe" aria-label="Criar nova equipe">
          <div class="form-group">
            <label for="novaEquipe"><i class="fas fa-users"></i> Nome da Equipe</label>
            <input type="text" id="novaEquipe" placeholder="Digite o nome da nova equipe" autocomplete="off" required aria-label="Nome da equipe">
          </div>
          <button type="submit" class="btn-create-equipe" aria-label="Criar equipe">
            <i class="fas fa-plus"></i> Criar Equipe
          </button>
        </form>
      </div>
      
      <div class="section">
        <h4><i class="fas fa-user-plus"></i> Criar Novo Usuário</h4>
        <form id="formCriarUsuario" aria-label="Criar novo usuário">
          <div class="form-group">
            <label for="novoUsuario"><i class="fas fa-user"></i> Nome do Usuário</label>
            <input type="text" id="novoUsuario" placeholder="Digite o nome do usuário" autocomplete="off" required aria-label="Nome do usuário">
          </div>
          <div class="form-group">
            <label for="novaSenha"><i class="fas fa-lock"></i> Senha</label>
            <input type="password" id="novaSenha" placeholder="Digite a senha do usuário" autocomplete="off" required aria-label="Senha do usuário">
            <div id="passwordStrength" class="password-strength"></div>
          </div>
          <div class="form-group">
            <label for="tipoUsuario"><i class="fas fa-user-tag"></i> Tipo de Usuário</label>
            <select id="tipoUsuario" required aria-label="Tipo de usuário">
              <option value="comum">Comum</option>
              <option value="financeiro">Financeiro</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label for="equipeUsuario"><i class="fas fa-users"></i> Equipe</label>
            <select id="equipeUsuario" aria-label="Equipe do usuário">
              <option value="Nenhuma">Nenhuma Equipe</option>
              ${equipeOptions.map(e => `<option value="${e}">${e}</option>`).join("")}
            </select>
          </div>
          <button type="submit" aria-label="Criar usuário">
            <i class="fas fa-user-plus"></i> Criar Usuário
          </button>
        </form>
        <div id="mensagemAdmin" role="alert"></div>
      </div>
      
      <div class="section">
        <h4><i class="fas fa-users-cog"></i> Gerenciar Usuários</h4>
        <div id="listaUsuarios" aria-live="polite"></div>
      </div>
    `;
    document.getElementById("formCriarUsuario").addEventListener("submit", Admin.createUser);
    document.getElementById("formCriarEquipe").addEventListener("submit", Admin.createTeam);
    document.getElementById("novaSenha").addEventListener("input", () => UI.updatePasswordStrength("novaSenha", "passwordStrength"));
    UserInterface.updateUserList();
  },
  updateValueList: (usuario) => {
    const semanaAtual = Utils.getSemanaAtual();
    const valores = State.valoresSemanais[semanaAtual]?.[usuario] || [];
    const div = document.getElementById("listaValores");
    if (!div) return;

    if (valores.length === 0) {
      div.innerHTML = `<div class="empty-state">
        <i class="fas fa-info-circle"></i>
        <p>Nenhum valor registrado nesta semana.</p>
      </div>`;
      return;
    }

    const equipeUsuario = State.equipes[usuario] || usuario;
    let html = `<table>
      <tr>
        <th>#</th>
        <th>Equipe</th>
        <th>Valor</th>
        <th>Observação</th>
        <th>Comprovante</th>
        <th>Ações</th>
      </tr>`;
      
    valores.forEach((item, i) => {
      html += `
        <tr>
          <td>${i + 1}</td>
          <td>${Utils.sanitizeInput(equipeUsuario)}</td>
          <td>${Utils.formatCurrency(item.valor)}</td>
          <td>${Utils.sanitizeInput(item.observacao) || '-'}</td>
          <td>${item.comprovante ? `<button class="btn-preview" onclick="Modal.openPreview('${item.comprovante.replace(/'/g, "\\'")}')" aria-label="Visualizar comprovante"><i class="fas fa-eye"></i> Visualizar</button>` : '-'}</td>
          <td>
            <div class="flex gap-2">
              <button onclick="Data.editValue('${semanaAtual}', '${usuario}', ${i})" aria-label="Editar valor"><i class="fas fa-edit"></i> Editar</button>
              <button class="btn-delete" onclick="Data.deleteValue('${semanaAtual}', '${usuario}', ${i})" aria-label="Excluir valor"><i class="fas fa-trash-alt"></i> Excluir</button>
            </div>
          </td>
        </tr>`;
    });
    
    html += `</table>`;
    const total = valores.reduce((a, b) => a + b.valor, 0) || 0;
    html += `
      <div class="total-summary">
        <span class="total-label">Total ${Utils.sanitizeInput(equipeUsuario)}:</span>
        <span class="total-value">${Utils.formatCurrency(total)}</span>
      </div>`;
    div.innerHTML = html;
  },
  updateUserList: () => {
    const div = document.getElementById("listaUsuarios");
    if (!div) return;

    let html = `<table>
      <tr>
        <th>Usuário</th>
        <th>Tipo</th>
        <th>Equipe</th>
        <th>Ações</th>
      </tr>`;
      
    State.usuarios.forEach(user => {
      const equipe = State.equipes[user.usuario] || "-";
      const isCurrentUser = user.usuario === State.usuarioLogado?.usuario;
      const tipoIcon = user.tipo === 'admin' ? 'fas fa-user-shield' : 
                      (user.tipo === 'financeiro' ? 'fas fa-user-tie' : 'fas fa-user');
                      
      const tipoLabel = user.tipo === 'admin' ? 'Administrador' : 
                      (user.tipo === 'financeiro' ? 'Financeiro' : 'Comum');
                      
      html += `
        <tr>
          <td><i class="${tipoIcon}"></i> ${Utils.sanitizeInput(user.usuario)}</td>
          <td>${tipoLabel}</td>
          <td>${Utils.sanitizeInput(equipe)}</td>
          <td>
            <div class="flex gap-2">
              <button class="btn-change-password" onclick="Admin.changePassword('${user.usuario}')" aria-label="Alterar senha de ${user.usuario}">
                <i class="fas fa-key"></i> Senha
              </button>
              <button class="btn-delete-user" onclick="Admin.deleteUser('${user.usuario}')" ${isCurrentUser ? 'disabled' : ''} aria-label="Excluir usuário ${user.usuario}">
                <i class="fas fa-trash-alt"></i> Excluir
              </button>
            </div>
          </td>
        </tr>`;
    });
    
    html += `</table>`;
    div.innerHTML = html;
  },
  showWeekValues: (semana) => {
    const data = State.valoresSemanais[semana];
    const div = document.getElementById("relatorioSemana");
    if (!div) return;

    if (!data || Object.keys(data).length === 0) {
      div.innerHTML = `<div class="empty-state">
        <i class="fas fa-info-circle"></i>
        <p>Nenhum valor registrado para esta semana.</p>
      </div>`;
      return;
    }

    let html = `<table>
      <tr>
        <th>Equipe</th>
        <th>Valores</th>
        <th>Observações</th>
        <th>Comprovantes</th>
        <th>Total</th>
      </tr>`;
      
    let totalGeral = 0;

    for (const usuario in data) {
      const equipe = State.equipes[usuario] || usuario;
      const valores = Array.isArray(data[usuario]) ? data[usuario] : [];
      const total = valores.reduce((a, b) => a + b.valor, 0) || 0;
      totalGeral += total;

      const valoresHTML = valores.length > 0 ? `<div class="value-list">${valores.map(item => `<p>${Utils.formatCurrency(item.valor)}</p>`).join("")}</div>` : "-";
      const observacoesHTML = valores.length > 0 ? `<div class="value-list">${valores.map(item => `<p>${Utils.sanitizeInput(item.observacao) || "-"}</p>`).join("")}</div>` : "-";
      const comprovantesHTML = valores.length > 0 ? `<div class="value-list">${valores.map((item, i) => item.comprovante ? `<p><button class="btn-preview" onclick="Modal.openPreview('${item.comprovante.replace(/'/g, "\\'")}')" aria-label="Visualizar comprovante"><i class="fas fa-eye"></i> Ver</button> <a href="${item.comprovante}" download="comprovante-${usuario}-${i}" class="comprovante-link" aria-label="Baixar comprovante">Baixar</a></p>` : `<p>-</p>`).join("")}</div>` : "-";
      
      html += `<tr>
        <td><strong>${Utils.sanitizeInput(equipe)}</strong></td>
        <td>${valoresHTML}</td>
        <td>${observacoesHTML}</td>
        <td>${comprovantesHTML}</td>
        <td><strong>${Utils.formatCurrency(total)}</strong></td>
      </tr>`;
    }

    html += `</table>
      <div class="total-summary">
        <span class="total-label">Total Geral:</span>
        <span class="total-value">${Utils.formatCurrency(totalGeral)}</span>
      </div>`;
    div.innerHTML = html;
  },
  updateTeamDropdown: () => {
    const equipeSelect = document.getElementById("equipeUsuario");
    if (!equipeSelect) return;

    const equipeOptions = Object.values(State.equipes).filter((v, i, a) => a.indexOf(v) === i);
    equipeSelect.innerHTML = `
      <option value="Nenhuma">Nenhuma Equipe</option>
      ${equipeOptions.map(e => `<option value="${e}">${e}</option>`).join("")}
    `;
  }
};

const Data = {
  addValue: async (event) => {
    event.preventDefault();
    const form = event.target;
    UI.setLoading(form.querySelector('button'), true);

    const valorInput = document.getElementById("valorInput")?.value;
    const observacaoInput = Utils.sanitizeInput(document.getElementById("observacaoInput")?.value.trim() || "");
    const comprovanteInput = document.getElementById("comprovanteInput")?.files[0];
    let valor;
    try {
      valor = parseFloat(valorInput);
      if (isNaN(valor) || valor <= 0) throw new Error('Valor inválido');
    } catch (e) {
      UI.showMessage("mensagemValor", "Erro: Digite um valor válido maior que zero (ex: 50,25).", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    if (!State.usuarioLogado || !Auth.verifyToken(State.usuarioLogado.token)) {
      UI.showMessage("mensagemValor", "Erro: Sessão inválida.", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    const equipeUsuario = State.equipes[State.usuarioLogado.usuario] || State.usuarioLogado.usuario;
    const semanaAtual = Utils.getSemanaAtual();

    let comprovante = "";
    if (comprovanteInput) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (comprovanteInput.size > maxSize) {
        UI.showMessage("mensagemValor", "Erro: O comprovante deve ter no máximo 5MB.", "error");
        UI.setLoading(form.querySelector('button'), false);
        return;
      }

      try {
        comprovante = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
          reader.readAsDataURL(comprovanteInput);
        });
        if (comprovante.length > 7 * 1024 * 1024) {
          UI.showMessage("mensagemValor", "Erro: Comprovante muito grande após conversão.", "error");
          UI.setLoading(form.querySelector('button'), false);
          return;
        }
      } catch (e) {
        UI.showMessage("mensagemValor", "Erro ao processar o comprovante.", "error");
        UI.setLoading(form.querySelector('button'), false);
        return;
      }
    }

    if (!State.valoresSemanais[semanaAtual]) State.valoresSemanais[semanaAtual] = {};
    if (!State.valoresSemanais[semanaAtual][State.usuarioLogado.usuario]) {
      State.valoresSemanais[semanaAtual][State.usuarioLogado.usuario] = [];
    }

    State.valoresSemanais[semanaAtual][State.usuarioLogado.usuario].push({ valor, observacao: observacaoInput, comprovante });
    State.saveAll();
    UserInterface.updateValueList(State.usuarioLogado.usuario);
    UI.showMessage("mensagemValor", `Valor ${Utils.formatCurrency(valor)} adicionado com sucesso para ${equipeUsuario}!`, "success");
    form.reset();
    UI.setLoading(form.querySelector('button'), false);
  },
  editValue: (semana, usuario, index) => {
    if (State.usuarioLogado?.usuario !== usuario && State.usuarioLogado?.tipo !== "financeiro") {
      UI.showMessage("mensagemValor", "Erro: Sem permissão para editar.", "error");
      return;
    }

    const item = State.valoresSemanais[semana][usuario][index];
    const novoValor = prompt("Digite o novo valor (R$):", item.valor.toFixed(2).replace('.', ','));
    const novaObservacao = prompt("Digite a nova observação (opcional):", item.observacao);
    let valorNumerico;
    try {
      valorNumerico = parseFloat(novoValor.replace(',', '.'));
      if (isNaN(valorNumerico) || valorNumerico <= 0) throw new Error('Valor inválido');
    } catch (e) {
      UI.showMessage("mensagemValor", "Erro: Valor inválido. Use o formato 1234,56.", "error");
      return;
    }

    if (confirm(`Alterar para ${Utils.formatCurrency(valorNumerico)} e observação "${novaObservacao || ''}"?`)) {
      State.valoresSemanais[semana][usuario][index] = {
        valor: valorNumerico,
        observacao: Utils.sanitizeInput(novaObservacao || ""),
        comprovante: item.comprovante
      };
      State.saveAll();
      UserInterface.updateValueList(usuario);
      UI.showMessage("mensagemValor", `Valor alterado para ${Utils.formatCurrency(valorNumerico)} com sucesso!`, "success");
    }
  },
  deleteValue: (semana, usuario, index) => {
    if (State.usuarioLogado?.usuario !== usuario && State.usuarioLogado?.tipo !== "financeiro") {
      UI.showMessage("mensagemValor", "Erro: Sem permissão para excluir.", "error");
      return;
    }

    const item = State.valoresSemanais[semana][usuario][index];
    if (confirm(`Excluir o valor ${Utils.formatCurrency(item.valor)} com observação "${item.observacao || ''}"?`)) {
      State.valoresSemanais[semana][usuario].splice(index, 1);
      if (State.valoresSemanais[semana][usuario].length === 0) {
        delete State.valoresSemanais[semana][usuario];
        if (Object.keys(State.valoresSemanais[semana]).length === 0) {
          delete State.valoresSemanais[semana];
        }
      }
      State.saveAll();
      UserInterface.updateValueList(usuario);
      UI.showMessage("mensagemValor", `Valor ${Utils.formatCurrency(item.valor)} excluído com sucesso!`, "success");
    }
  }
};

const Admin = {
  createUser: (event) => {
    event.preventDefault();
    const form = event.target;
    UI.setLoading(form.querySelector('button'), true);

    const username = Utils.sanitizeInput(document.getElementById("novoUsuario")?.value.trim().toLowerCase());
    const password = document.getElementById("novaSenha")?.value;
    const tipo = document.getElementById("tipoUsuario")?.value;
    const equipe = document.getElementById("equipeUsuario")?.value;

    if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9]+$/.test(username)) {
      UI.showMessage("mensagemAdmin", "Erro: Usuário deve ter 3-20 caracteres alfanuméricos.", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    if (State.usuarios.some(u => u.usuario.toLowerCase() === username)) {
      UI.showMessage("mensagemAdmin", "Erro: Usuário já existe.", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    if (!password || Utils.validatePasswordStrength(password) === 'weak') {
      UI.showMessage("mensagemAdmin", "Erro: Senha fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e caracteres especiais.", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    if (!["comum", "financeiro", "admin"].includes(tipo)) {
      UI.showMessage("mensagemAdmin", "Erro: Tipo de usuário inválido.", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    const novoUsuario = { usuario: username, senha: password, tipo, token: Utils.generateUUID() };
    State.usuarios.push(novoUsuario);
    if (equipe && equipe !== "Nenhuma" && tipo === "comum") {
      State.equipes[username] = equipe;
    }
    State.saveAll();
    UserInterface.updateUserList();
    UserInterface.updateTeamDropdown();
    UI.showMessage("mensagemAdmin", `Usuário ${username} criado com sucesso!`, "success");
    form.reset();
    UI.setLoading(form.querySelector('button'), false);
  },
  deleteUser: (targetUser) => {
    if (targetUser === State.usuarioLogado?.usuario) {
      UI.showMessage("mensagemAdmin", "Erro: Não é possível excluir o usuário logado.", "error");
      return;
    }

    const user = State.usuarios.find(u => u.usuario === targetUser);
    if (!user) {
      UI.showMessage("mensagemAdmin", "Erro: Usuário não encontrado.", "error");
      return;
    }

    if (confirm(`Excluir o usuário ${targetUser} e todos os seus dados? Esta ação não pode ser desfeita.`)) {
      State.usuarios = State.usuarios.filter(u => u.usuario !== targetUser);
      for (const semana in State.valoresSemanais) {
        if (State.valoresSemanais[semana][targetUser]) {
          delete State.valoresSemanais[semana][targetUser];
          if (Object.keys(State.valoresSemanais[semana]).length === 0) {
            delete State.valoresSemanais[semana];
          }
        }
      }
      if (State.equipes[targetUser]) {
        delete State.equipes[targetUser];
      }
      State.saveAll();
      UserInterface.updateUserList();
      UI.showMessage("mensagemAdmin", `Usuário ${targetUser} excluído com sucesso!`, "success");
    }
  },
  changePassword: (targetUser) => {
    const novaSenha = prompt(`Digite a nova senha para ${targetUser}:`);
    if (!novaSenha || Utils.validatePasswordStrength(novaSenha) === 'weak') {
      UI.showMessage("mensagemAdmin", "Erro: Nova senha fraca. Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e caracteres especiais.", "error");
      return;
    }

    if (confirm(`Alterar a senha de ${targetUser} para a nova senha?`)) {
      const user = State.usuarios.find(u => u.usuario === targetUser);
      if (user) {
        user.senha = novaSenha;
        user.token = Utils.generateUUID();
        State.saveAll();
        UserInterface.updateUserList();
        UI.showMessage("mensagemAdmin", `Senha de ${targetUser} alterada com sucesso!`, "success");
      } else {
        UI.showMessage("mensagemAdmin", "Erro: Usuário não encontrado.", "error");
      }
    }
  },
  createTeam: (event) => {
    event.preventDefault();
    const form = event.target;
    UI.setLoading(form.querySelector('button'), true);

    const equipeName = Utils.sanitizeInput(document.getElementById("novaEquipe")?.value.trim());
    if (!equipeName || equipeName.length < 3 || equipeName.length > 30 || !/^[a-zA-Z0-9\s]+$/.test(equipeName)) {
      UI.showMessage("mensagemAdmin", "Erro: Nome da equipe deve ter 3-30 caracteres alfanuméricos.", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    if (Object.values(State.equipes).includes(equipeName)) {
      UI.showMessage("mensagemAdmin", "Erro: Equipe já existe.", "error");
      UI.setLoading(form.querySelector('button'), false);
      return;
    }

    State.equipes[`_equipe_${equipeName.replace(/\s/g, '_').toLowerCase()}`] = equipeName;
    State.saveAll();
    UserInterface.updateTeamDropdown();
    UI.showMessage("mensagemAdmin", `Equipe ${equipeName} criada com sucesso!`, "success");
    form.reset();
    UI.setLoading(form.querySelector('button'), false);
  }
};

const Reports = {
  generatePDF: () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const semana = document.getElementById("semanasSelect")?.value;
    const dados = State.valoresSemanais[semana];

    if (!dados || Object.keys(dados).length === 0) {
      UI.showMessage("mensagem", "Nenhum dado disponível para gerar o PDF.", "error");
      return;
    }

    const titleColor = [67, 97, 238];
    const textColor = [33, 37, 41];
    const headerColor = [76, 201, 240];
    
    let y = 20;
    
    doc.setFillColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.rect(0, 0, doc.internal.pageSize.width, 15, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.text("Relatório Semanal de Valores", 105, 10, null, null, "center");
    
    doc.setFontSize(12);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont(undefined, "normal");
    doc.text(`Semana: ${semana}`, 105, y, null, null, "center");
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, y + 6, null, null, "center");
    y += 20;

    let totalGeral = 0;
    for (const usuario in dados) {
      const equipe = State.equipes[usuario] || usuario;
      const valores = Array.isArray(dados[usuario]) ? dados[usuario] : [];
      const total = valores.reduce((a, b) => a + b.valor, 0) || 0;
      totalGeral += total;

      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2], 0.1);
      doc.rect(10, y - 4, doc.internal.pageSize.width - 20, 8, 'F');
      doc.setFont(undefined, "bold");
      doc.text(`Equipe: ${equipe}`, 15, y);
      doc.setFont(undefined, "normal");
      y += 10;
      
      if (valores.length > 0) {
        doc.setFillColor(headerColor[0], headerColor[1], headerColor[2], 0.05);
        doc.rect(15, y - 4, 25, 8, 'F');
        doc.rect(40, y - 4, 110, 8, 'F');
        doc.setFont(undefined, "bold");
        doc.text("Valor", 20, y);
        doc.text("Observação", 50, y);
        doc.setFont(undefined, "normal");
        y += 6;
        
        valores.forEach((item, i) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${Utils.formatCurrency(item.valor)}`, 20, y);
          doc.text(`${item.observacao || "-"}`, 50, y);
          y += 8;
        });
      } else {
        doc.text("Nenhum valor registrado", 15, y);
        y += 8;
      }

      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2], 0.1);
      doc.rect(100, y - 4, 100, 8, 'F');
      doc.setFont(undefined, "bold");
      doc.text(`Total: ${Utils.formatCurrency(total)}`, 150, y, null, null, "right");
      doc.setFont(undefined, "normal");
      y += 15;
      
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    }

    doc.setFillColor(titleColor[0], titleColor[1], titleColor[2], 0.2);
    doc.rect(100, y - 4, 100, 10, 'F');
    doc.setFont(undefined, "bold");
    doc.setFontSize(14);
    doc.text(`Total Geral: ${Utils.formatCurrency(totalGeral)}`, 150, y, null, null, "right");
    
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, null, null, "center");
      doc.text("Sistema de Relatório Semanal de Valores", 105, 295, null, null, "center");
    }
    
    doc.save(`relatorio-semanal-${semana.replace(/[/]/g, '-')}.pdf`);
    UI.showMessage("mensagem", "PDF gerado com sucesso!", "success");
  }
};

const Theme = {
  toggle: () => {
    const newTheme = State.theme === 'light' ? 'dark' : 'light';
    State.theme = newTheme;
    document.body.classList.toggle('dark-mode', newTheme === 'dark');
    
    const themeButton = document.querySelector('.btn-toggle-theme');
    if (themeButton) {
      const themeIcon = themeButton.querySelector('i');
      if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    }
    
    State.saveAll();
  },
  init: () => {
    if (State.theme === 'dark') {
      document.body.classList.add('dark-mode');
      setTimeout(() => {
        const themeButton = document.querySelector('.btn-toggle-theme');
        if (themeButton) {
          const themeIcon = themeButton.querySelector('i');
          if (themeIcon) {
            themeIcon.className = 'fas fa-sun';
          }
        }
      }, 100);
    }
  }
};

document.getElementById("loginForm")?.addEventListener("submit", Auth.login);
document.getElementById("previewModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("previewModal")) {
    Modal.closePreview();
  }
});
document.getElementById("githubConfigModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("githubConfigModal")) {
    GitHub.closeConfigModal();
  }
});
document.getElementById("githubConfigForm")?.addEventListener("submit", GitHub.saveConfig);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    Modal.closePreview();
    GitHub.closeConfigModal();
  }
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    const form = e.target.closest('form');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.querySelectorAll('input, textarea, select').forEach(input => {
      const parent = input.parentElement;
      if (parent && !parent.classList.contains('form-group')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.textContent = input.placeholder || input.id;
        
        const icon = document.createElement('i');
        
        if (input.type === 'password') icon.className = 'fas fa-lock';
        else if (input.type === 'email') icon.className = 'fas fa-envelope';
        else if (input.type === 'number') icon.className = 'fas fa-dollar-sign';
        else if (input.tagName === 'TEXTAREA') icon.className = 'fas fa-comment';
        else if (input.tagName === 'SELECT') icon.className = 'fas fa-list';
        else icon.className = 'fas fa-user';
        
        label.prepend(icon, ' ');
        
        parent.insertBefore(wrapper, input);
        wrapper.appendChild(label);
        wrapper.appendChild(input);
      }
    });
  });
});

window.onerror = (message, source, lineno, colno, error) => {
  console.error(`Erro global: ${message} em ${source}:${lineno}:${colno}`, error);
  UI.showMessage('mensagem', 'Erro interno no sistema. Verifique o console.', 'error');
};

window.onload = () => {
  GitHub.init();
  State.loadAll();
  migrateData();
  Theme.init();
};

window.voltarLogin = Auth.logout;
window.closePreviewModal = Modal.closePreview;
window.closeGithubConfigModal = GitHub.closeConfigModal;
window.toggleTheme = Theme.toggle;
window.GitHub = GitHub;
window.UserInterface = UserInterface;