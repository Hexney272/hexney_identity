--[[
    hexney_identity - server (V2)
    - online players by job (live)
    - weekly playtime persistence (per identifier, weekly bucket)
    - achievement unlock persistence (per identifier)
]]

local ESX = exports['es_extended']:getSharedObject()

local RES        = GetCurrentResourceName()
local STORE_FILE = 'data/stats.json'

-- store[identifier] = { week = '2026-23', seconds = N, ach = { id = true } }
local store  = {}
-- online[src]  = { id = identifier, last = os.time() }
local online = {}

-----------------------------------------------------------
-- HELPERS
-----------------------------------------------------------
local function currentWeek()
    return os.date('%Y-%W')
end

local function loadStore()
    local raw = LoadResourceFile(RES, STORE_FILE)
    if raw and #raw > 0 then
        local ok, decoded = pcall(json.decode, raw)
        if ok and type(decoded) == 'table' then
            store = decoded
        end
    end
end

local saveQueued = false
local function saveStore()
    -- debounce disk writes to at most once per second
    if saveQueued then return end
    saveQueued = true
    SetTimeout(1000, function()
        saveQueued = false
        SaveResourceFile(RES, STORE_FILE, json.encode(store), -1)
    end)
end

-- returns the (week-normalized) record for an identifier, creating it if needed
local function getRecord(identifier)
    if not identifier then return nil end
    local rec = store[identifier]
    local week = currentWeek()
    if not rec then
        rec = { week = week, seconds = 0, ach = {} }
        store[identifier] = rec
    elseif rec.week ~= week then
        -- new week: reset playtime, keep achievements
        rec.week = week
        rec.seconds = 0
    end
    rec.ach = rec.ach or {}
    return rec
end

local function identifierOf(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return nil end
    return xPlayer.getIdentifier and xPlayer.getIdentifier() or xPlayer.identifier
end

-- accumulate elapsed online time into the weekly bucket
local function flushPlaytime(src)
    local meta = online[src]
    if not meta then return end
    local now = os.time()
    local elapsed = now - (meta.last or now)
    if elapsed < 0 then elapsed = 0 end
    meta.last = now

    local rec = getRecord(meta.id)
    if rec then
        rec.seconds = rec.seconds + elapsed
    end
end

-----------------------------------------------------------
-- LIFECYCLE
-----------------------------------------------------------
AddEventHandler('esx:playerLoaded', function(playerId, xPlayer)
    local identifier = xPlayer.getIdentifier and xPlayer.getIdentifier() or xPlayer.identifier
    online[playerId] = { id = identifier, last = os.time() }
    getRecord(identifier) -- ensure a record exists / week-normalized
end)

AddEventHandler('playerDropped', function()
    local src = source
    flushPlaytime(src)
    online[src] = nil
    saveStore()
end)

-- periodic playtime flush + save
CreateThread(function()
    local rate = (Config.WeeklySaveRate or 60) * 1000
    while true do
        Wait(rate)
        for src in pairs(online) do
            flushPlaytime(src)
        end
        saveStore()
    end
end)

AddEventHandler('onResourceStop', function(res)
    if res ~= RES then return end
    for src in pairs(online) do flushPlaytime(src) end
    SaveResourceFile(RES, STORE_FILE, json.encode(store), -1)
end)

-----------------------------------------------------------
-- CALLBACKS / EVENTS
-----------------------------------------------------------
-- online players grouped by raw job name (client aggregates into groups)
ESX.RegisterServerCallback('hexney_identity:getOnline', function(source, cb)
    local counts = {}
    local total  = 0

    for _, xPlayer in pairs(ESX.GetExtendedPlayers()) do
        local jobName = (xPlayer.job and xPlayer.job.name) or 'unemployed'
        counts[jobName] = (counts[jobName] or 0) + 1
        total = total + 1
    end

    cb({
        counts = counts,
        total  = total,
        ping   = GetPlayerPing(tostring(source)) or 0,
    })
end)

-- returns the player's persisted stats (weekly playtime + unlocked achievements)
ESX.RegisterServerCallback('hexney_identity:loadStats', function(source, cb)
    if not online[source] then
        online[source] = { id = identifierOf(source), last = os.time() }
    end
    flushPlaytime(source)

    local rec = getRecord(online[source].id)
    cb({
        weeklySeconds = rec and rec.seconds or 0,
        achievements  = rec and rec.ach or {},
    })
end)

-- client reports a newly unlocked achievement; we persist it
RegisterNetEvent('hexney_identity:unlock', function(achId)
    local src = source
    if type(achId) ~= 'string' then return end

    -- validate the id against config to avoid arbitrary writes
    local valid = false
    for _, a in ipairs(Config.Achievements or {}) do
        if a.id == achId then valid = true break end
    end
    if not valid then return end

    local id = online[src] and online[src].id or identifierOf(src)
    if not id then return end

    local rec = getRecord(id)
    if rec and not rec.ach[achId] then
        rec.ach[achId] = true
        saveStore()
    end
end)

-----------------------------------------------------------
-- BOOT
-----------------------------------------------------------
loadStore()
