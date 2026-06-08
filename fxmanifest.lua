fx_version 'cerulean'
game 'gta5'

name 'hexney_identity'
author 'Hexney'
description 'Identity Card 2026 - Premium character profile overlay'
version '1.0.0'
lua54 'yes'

ui_page 'html/index.html'

shared_script 'config.lua'

client_script 'client/client.lua'

server_script 'server/server.lua'

files {
    'html/index.html',
    'html/css/style.css',
    'html/js/app.js',
}

-- ESX Legacy is required. esx_status / pma-voice are soft dependencies
-- (the resource degrades gracefully if they are missing).
dependencies {
    'es_extended',
}
