const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('hsopsc.db');

db.run('DELETE FROM respostas', (err) => {
    if (err) {
        console.error('Erro:', err);
    } else {
        console.log('🧹 Banco limpo com sucesso!');
    }
    db.close();
});