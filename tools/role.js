// Give someone a role from the server's command line, e.g. if the only
// admin has left. Run it on the server, where the database is:
//   DATA_DIR=./data node tools/role.js                 list moderators and admins
//   DATA_DIR=./data node tools/role.js tony admin      make "tony" an admin
// The person is found by wiki username, Discord name or Discord id.
import { openDb } from '../server/db.js';

const db = openDb(process.env.DATA_DIR || 'data');
const [who, role] = process.argv.slice(2);
if (!who) {
  const rows = db.prepare("SELECT username, role, discord_name FROM users WHERE role <> 'user' ORDER BY role, username").all();
  console.log(rows.length ? rows.map((r) => `${r.role.padEnd(6)} ${r.username}${r.discord_name ? ` (Discord: ${r.discord_name})` : ''}`).join('\n') : 'No moderators or admins yet.');
  console.log('\nUsage: node tools/role.js <username | Discord name | Discord id> <user | mod | admin>');
  process.exit(0);
}
if (!['user', 'mod', 'admin'].includes(role)) {
  console.error('The role must be user, mod or admin.');
  process.exit(1);
}
const matches = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE OR discord_id = ? OR discord_name = ? COLLATE NOCASE').all(who, who, who);
if (matches.length !== 1) {
  console.error(matches.length ? `${matches.length} people match “${who}”: ${matches.map((u) => u.username).join(', ')}. Use the wiki username.` : `Nobody matches “${who}”. They need to sign in with Discord once first.`);
  process.exit(1);
}
const u = matches[0];
db.prepare("UPDATE users SET role = ?, role_source = 'manual', status = CASE WHEN status = 'pending' THEN 'active' ELSE status END WHERE id = ?").run(role, u.id);
db.prepare('INSERT INTO audit (user_id, action, target, detail, created_at) VALUES (NULL, ?, ?, ?, ?)').run('role', u.username, `${role} (from the command line)`, Date.now());
console.log(`${u.username} is now ${role === 'user' ? 'a user' : `${role === 'mod' ? 'a moderator' : 'an admin'}`}.`);
