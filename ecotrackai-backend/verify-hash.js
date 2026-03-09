const bcrypt = require('bcryptjs');
const hash = '$2b$10$9N41vGS1nKpNUzF6B5Jfm.t2oLJsSsKXilz4dJm5EqofDvgAVugOW';
bcrypt.compare('EcoTrack@SuperAdmin2026', hash).then(result => console.log('Match:', result));