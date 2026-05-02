const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { exec } = require('child_process');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Caminho correto para rodar no .exe
const basePath = process.pkg
  ? path.dirname(process.execPath)
  : __dirname;

app.use(express.static(path.join(basePath, 'public')));

// Banco de dados
const db = new sqlite3.Database('hsopsc.db');

// Criar tabela
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS respostas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cargo INTEGER,
        unidade INTEGER,
        respostas TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// SALVAR RESPOSTA
app.post('/api/resposta', (req, res) => {
    const { cargo, unidade, respostas } = req.body;
    
    console.log('💾 Salvando:', { cargo, unidade });
    
    db.run(
        'INSERT INTO respostas (cargo, unidade, respostas) VALUES (?,?,?)',
        [cargo, unidade, JSON.stringify(respostas)],
        function(err) {
            if (err) {
                console.error("Erro:", err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('✅ Salvo! ID:', this.lastID);
            res.json({ success: true, id: this.lastID });
        }
    );
});

// RELATÓRIO POR CARGO
app.get('/api/relatorios/cargos', (req, res) => {
    console.log('📊 Gerando relatório de cargos...');
    
    const sql = `
        SELECT cargo, COUNT(*) as quantidade 
        FROM respostas 
        WHERE cargo IS NOT NULL 
        GROUP BY cargo 
        ORDER BY quantidade DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erro:", err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log('📈 Cargos encontrados:', rows);
        res.json(rows);
    });
});

// RELATÓRIO POR UNIDADE
app.get('/api/relatorios/unidades', (req, res) => {
    console.log('📊 Gerando relatório de unidades...');
    
    const sql = `
        SELECT unidade, COUNT(*) as quantidade 
        FROM respostas 
        WHERE unidade IS NOT NULL 
        GROUP BY unidade 
        ORDER BY quantidade DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erro:", err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        console.log('📈 Unidades encontradas:', rows);
        res.json(rows);
    });
});

// RELATÓRIO DINÂMICO
app.get('/api/relatorios', (req, res) => {
    const { pergunta, cargo } = req.query;
    
    console.log('📊 Relatório solicitado:', { pergunta, cargo });
    
    let sql = 'SELECT cargo, respostas FROM respostas WHERE respostas IS NOT NULL';
    let params = [];
    
    if (cargo && cargo !== '') {
        sql += ' AND cargo = ?';
        params.push(cargo);
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error("Erro DB:", err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        const filtrados = rows.filter(row => {
            try {
                const r = JSON.parse(row.respostas || '{}');
                return r[pergunta] !== undefined && r[pergunta] !== '';
            } catch {
                return false;
            }
        });
        
        console.log(`✅ ${filtrados.length} respostas válidas`);
        res.json(filtrados);
    });
});

// DEBUG
app.get('/api/debug/respostas', (req, res) => {
    db.all(
        'SELECT id, cargo, unidade, data FROM respostas ORDER BY id DESC LIMIT 10',
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

app.get('/api/debug/total', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM respostas', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ total: row.count });
    });
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor rodando...');
});

  });