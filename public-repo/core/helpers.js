const path = require('path');
const fs = require('fs');

function suppressLibsignalLogs() {
    try {
        ['session_record.js', 'session_builder.js', 'session_cipher.js'].forEach(file => {
            const filePath = path.join(__dirname, '..', 'node_modules', 'libsignal', 'src', file);
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                const modified = content.replace(/^(\s*console\..+;)$/gm, '// $1');
                if (content !== modified) fs.writeFileSync(filePath, modified, 'utf8');
            }
        });
    } catch {}
}

function addYtdlp60fpsSupport() {
    try {
        const ytdlpPath = path.join(__dirname, '..', 'node_modules', 'ytdlp-nodejs', 'dist', 'index.js');
        if (!fs.existsSync(ytdlpPath)) return;
        let content = fs.readFileSync(ytdlpPath, 'utf8');
        if (content.includes('1080p60') || content.includes('720p60')) return;
        const match = content.match(/var V=\{([^}]+)\}/);
        
        if (match) {
            const newFormats = match[1].replace(
                '"1080p":"bv*[height<=1080]"',
                '"2160p60":"bv*[height<=2160][fps>=60]","1440p60":"bv*[height<=1440][fps>=60]","1080p60":"bv*[height<=1080][fps>=60]","720p60":"bv*[height<=720][fps>=60]","1080p":"bv*[height<=1080]"'
            );
            const modifiedContent = content.replace(/var V=\{([^}]+)\}/, `var V={${newFormats}}`);
            
            if (content !== modifiedContent) {
                fs.writeFileSync(ytdlpPath, modifiedContent, 'utf8');
                console.log('✅ Added 60fps format support to ytdlp-nodejs (2160p60, 1440p60, 1080p60, 720p60)');
            }
        } else {
            console.log('⚠️ Could not find format definitions in ytdlp-nodejs');
        }
    } catch (error) {
        console.error('Error adding 60fps support to ytdlp-nodejs:', error.message);
    }
}

module.exports = {
    suppressLibsignalLogs,
    addYtdlp60fpsSupport
};
