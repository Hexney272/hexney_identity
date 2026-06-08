--[[
    hexney_identity - client (V2)
    Identity Card 2026
]]

local ESX = exports['es_extended']:getSharedObject()

local isOpen        = false
local isLoaded      = false
local PlayerData    = {}
local sessionStart  = GetGameTimer()

-- cached live status values (0-100)
local hungerPct     = 100.0
local thirstPct     = 100.0

-- last voice state we sent (avoid spamming NUI)
local lastTalking   = nil

-- V2 state -----------------------------------------------------------
local statsLoaded     = false
local weeklyBaseSec   = 0          -- weekly playtime returned by server
local statsLoadedAt   = GetGameTimer()
local unlocked        = {}         -- { [achId] = true }
local baselineMoney   = nil        -- total money at session start (for wage)

local pedHandle       = nil
local pedTxd          = nil
local pedReady        = false

-- V3 state
local cachedPhone     = nil        -- resolved phone number (client- or server-side)

-----------------------------------------------------------
-- UTIL
-----------------------------------------------------------
local function sendUI(action, data)
    data = data or {}
    data.action = action
    SendNUIMessage(data)
end

local function formatHM(totalSec)
    if totalSec < 0 then totalSec = 0 end
    local totalMin = math.floor(totalSec / 60)
    local h = math.floor(totalMin / 60)
    local m = totalMin % 60
    return string.format('%dh %02dm', h, m)
end

-- ESX accounts are an array of { name, money, label }
local function getAccount(name)
    if not PlayerData.accounts then return 0 end
    for _, acc in ipairs(PlayerData.accounts) do
        if acc.name == name then
            return acc.money or 0
        end
    end
    return 0
end

-- 100..200 health -> 0..100 percent
local function getHealthPct(ped)
    local h = GetEntityHealth(ped)
    if h <= 100 then return 0 end
    local pct = (h - 100) / 100 * 100
    if pct > 100 then pct = 100 end
    return math.floor(pct)
end

-----------------------------------------------------------
-- esx_status hooks (hunger / thirst)
-----------------------------------------------------------
local function refreshStatuses()
    if Config.HungerStatus then
        TriggerEvent('esx_status:getStatus', Config.HungerStatus, function(status)
            if status and status.getPercent then hungerPct = status.getPercent() end
        end)
    end
    if Config.ThirstStatus then
        TriggerEvent('esx_status:getStatus', Config.ThirstStatus, function(status)
            if status and status.getPercent then thirstPct = status.getPercent() end
        end)
    end
end

-----------------------------------------------------------
-- ESX player data sync
-----------------------------------------------------------
RegisterNetEvent('esx:playerLoaded', function(xPlayer)
    PlayerData   = xPlayer
    isLoaded     = true
    sessionStart = GetGameTimer()
    baselineMoney = nil
    statsLoaded  = false
end)

RegisterNetEvent('esx:setJob', function(job)
    PlayerData.job = job
end)

RegisterNetEvent('esx:setAccountMoney', function(account)
    if not PlayerData.accounts then return end
    for i = 1, #PlayerData.accounts do
        if PlayerData.accounts[i].name == account.name then
            PlayerData.accounts[i] = account
            break
        end
    end
end)

CreateThread(function()
    while ESX.GetPlayerData() == nil or ESX.GetPlayerData().job == nil do
        Wait(250)
    end
    PlayerData = ESX.GetPlayerData()
    isLoaded   = true
end)

-----------------------------------------------------------
-- V2: SERVER STATS (weekly playtime + achievements)
-----------------------------------------------------------
local function loadStats()
    ESX.TriggerServerCallback('hexney_identity:loadStats', function(result)
        if not result then return end
        weeklyBaseSec = result.weeklySeconds or 0
        statsLoadedAt = GetGameTimer()
        unlocked      = result.achievements or {}
        statsLoaded   = true
    end)
end

local function weeklySeconds()
    return weeklyBaseSec + math.floor((GetGameTimer() - statsLoadedAt) / 1000)
end

-----------------------------------------------------------
-- V2: ACHIEVEMENTS
-----------------------------------------------------------
local function evaluateAchievements(ctx)
    if not Config.ShowAchievements then return {} end

    local list = {}
    for _, a in ipairs(Config.Achievements) do
        local got = unlocked[a.id] == true
        if not got then
            local ok, res = pcall(a.check, ctx)
            if ok and res then
                got = true
                unlocked[a.id] = true
                TriggerServerEvent('hexney_identity:unlock', a.id)
                sendUI('achievement', { id = a.id, label = a.label, emoji = a.emoji, desc = a.desc })
            end
        end
        list[#list + 1] = {
            id = a.id, label = a.label, emoji = a.emoji, desc = a.desc, unlocked = got,
        }
    end
    return list
end

-----------------------------------------------------------
-- V2: LIVE PED RENDER (native DrawSprite overlay)
-----------------------------------------------------------
local function releaseHeadshot()
    if pedHandle then
        UnregisterPedheadshot(pedHandle)
        pedHandle = nil
    end
    pedTxd   = nil
    pedReady = false
end

local function requestHeadshot()
    if not (Config.PedRender and Config.PedRender.enabled) then return end
    releaseHeadshot()

    local ped = PlayerPedId()
    -- prefer the transparent-background variant so the avatar slot stays
    -- clean (no black box); fall back to the standard one if unavailable.
    local handle
    if RegisterPedheadshotTransparent then
        handle = RegisterPedheadshotTransparent(ped)
    else
        handle = RegisterPedheadshot(ped)
    end
    pedHandle = handle

    CreateThread(function()
        local tries = 0
        while pedHandle == handle and not IsPedheadshotReady(handle) do
            tries = tries + 1
            if tries > 250 then return end -- ~5s timeout
            Wait(20)
        end
        if pedHandle ~= handle then return end
        if IsPedheadshotValid(handle) then
            pedTxd   = GetPedheadshotTxdString(handle)
            pedReady = true
            sendUI('ped', { ready = true })
        end
    end)
end

-- draw the headshot on top of the NUI card while it is open.
-- Size is HARD-CLAMPED so a misconfigured value can never cover the screen.
CreateThread(function()
    while true do
        local p = Config.PedRender
        if isOpen and pedReady and pedTxd and p and p.enabled then
            local x = tonumber(p.x) or 0.158
            local y = tonumber(p.y) or 0.330
            local w = math.min(math.max(tonumber(p.w) or 0.052, 0.0), 0.15)
            local h = math.min(math.max(tonumber(p.h) or 0.092, 0.0), 0.22)
            DrawSprite(pedTxd, pedTxd, x, y, w, h, 0.0, 255, 255, 255, 255)
            Wait(0)
        else
            Wait(120)
        end
    end
end)

-----------------------------------------------------------
-- DATA BUILD + PUSH
-----------------------------------------------------------
local function buildAndSend()
    if not isLoaded or not PlayerData.job then return end

    refreshStatuses()

    local ped       = PlayerPedId()
    local jobName   = PlayerData.job and PlayerData.job.name or 'unemployed'
    local groupKey  = Config.GetGroupKey(jobName)
    local group     = Config.JobGroups[groupKey] or Config.JobGroups[Config.DefaultGroup]

    local cash      = getAccount(Config.CashAccount)
    local bank      = getAccount(Config.BankAccount)
    local total     = cash + bank
    if baselineMoney == nil then baselineMoney = total end

    local sessionSec = math.floor((GetGameTimer() - sessionStart) / 1000)
    local weekSec    = weeklySeconds()

    local hunger = Config.HungerStatus and math.floor(hungerPct) or nil
    local thirst = Config.ThirstStatus and math.floor(thirstPct) or nil
    local health = Config.ShowHealth and getHealthPct(ped) or nil
    local armor  = Config.ShowArmor and GetPedArmour(ped) or nil

    -- wage: net earnings this session + extrapolated hourly rate
    local earned = total - baselineMoney
    local hours  = math.max(sessionSec / 3600, 1 / 60) -- avoid divide-by-zero spikes
    local perHour = math.floor(earned / hours)

    -- achievement context + evaluation
    local ctx = {
        cash = cash, bank = bank, total = total,
        sessionSeconds = sessionSec, weeklySeconds = weekSec,
        jobGroup = groupKey,
        health = health, armor = armor, hunger = hunger, thirst = thirst,
    }
    local achievements = evaluateAchievements(ctx)

    local payload = {
        brand    = Config.Brand,
        subBrand = Config.SubBrand,
        name     = (('%s %s'):format(PlayerData.firstName or '', PlayerData.lastName or ''):gsub('^%s*(.-)%s*$', '%1')),
        id       = GetPlayerServerId(PlayerId()),
        job      = PlayerData.job and PlayerData.job.label or 'Unemployed',
        grade    = PlayerData.job and PlayerData.job.grade_label or '',
        groupKey = groupKey,
        accent   = group.color,
        emoji    = group.emoji,
        cash     = cash,
        bank     = bank,
        health   = health,
        armor    = armor,
        hunger   = hunger,
        thirst   = thirst,
        session  = formatHM(sessionSec),
        pedReady = pedReady,

        -- V2
        weekly       = Config.ShowWeekly and formatHM(weekSec) or nil,
        wageEarned   = Config.ShowWage and earned or nil,
        wagePerHour  = Config.ShowWage and perHour or nil,
        achievements = achievements,

        -- V3
        phone        = cachedPhone,
    }

    sendUI('update', { player = payload })
end

-----------------------------------------------------------
-- ONLINE PANEL (server callback)
-----------------------------------------------------------
local function refreshOnline()
    ESX.TriggerServerCallback('hexney_identity:getOnline', function(result)
        if not result then return end

        local buckets = {}
        for key, group in pairs(Config.JobGroups) do
            buckets[key] = {
                key = key, label = group.label, icon = group.icon,
                emoji = group.emoji, color = group.color,
                order = group.order or 50, count = 0,
            }
        end

        for jobName, count in pairs(result.counts or {}) do
            local key = Config.GetGroupKey(jobName)
            if buckets[key] then
                buckets[key].count = buckets[key].count + count
            end
        end

        local groups = {}
        for _, b in pairs(buckets) do groups[#groups + 1] = b end
        table.sort(groups, function(a, b) return a.order < b.order end)

        sendUI('online', { groups = groups, total = result.total or 0, ping = result.ping or 0 })
    end)
end

-----------------------------------------------------------
-- V3: PHONE NUMBER ADAPTER
-----------------------------------------------------------
-- Client-side phone resources, tried in order. Each attempt is
-- pcall-guarded so a missing/foreign phone never errors.
local function resolvePhoneClient()
    if not Config.ShowPhone then return nil end
    local provider = Config.PhoneProvider or 'auto'

    local function try(name, fn)
        if provider ~= 'auto' and provider ~= name then return nil end
        local ok, res = pcall(fn)
        if ok and res and res ~= '' and res ~= false then return tostring(res) end
        return nil
    end

    return try('lb-phone', function()
            return exports['lb-phone']:GetEquippedPhoneNumber()
        end)
        or try('qb-phone', function()
            local pd = exports['qb-core']:GetCoreObject().Functions.GetPlayerData()
            return pd and pd.charinfo and pd.charinfo.phone
        end)
        or try('gksphone', function()
            return exports['gksphone']:GetNumber()
        end)
        or try('npwd', function()
            return exports.npwd:getPhoneNumber()
        end)
        or nil
end

-- Resolves the phone number into `cachedPhone`. Client-side providers are
-- read instantly; server-side providers (Quasar Smartphone v3) are fetched
-- via a server callback and fill in shortly after (next refresh tick).
local function resolvePhone()
    if not Config.ShowPhone then cachedPhone = nil return end

    cachedPhone = resolvePhoneClient()

    local provider = Config.PhoneProvider or 'auto'
    if cachedPhone == nil and (provider == 'auto' or provider == 'quasar') then
        ESX.TriggerServerCallback('hexney_identity:getPhone', function(num)
            if num and num ~= '' then
                cachedPhone = tostring(num)
                if isOpen then buildAndSend() end
            end
        end)
    end
end

-----------------------------------------------------------
-- V3: FACTION / BUSINESS (society) PANEL
-----------------------------------------------------------
local function refreshSociety()
    if not Config.ShowSociety then return end

    local jobName  = PlayerData.job and PlayerData.job.name
    local groupKey = Config.GetGroupKey(jobName)
    local kind     = Config.SocietyKind and Config.SocietyKind[groupKey] or nil

    if not kind then
        sendUI('society', { show = false })
        return
    end

    ESX.TriggerServerCallback('hexney_identity:getSociety', function(res)
        if not res then sendUI('society', { show = false }) return end

        local labels = (Config.SocietyLabels and Config.SocietyLabels[kind])
            or { title = string.upper(kind), emoji = '' }

        sendUI('society', {
            show          = true,
            kind          = kind,
            title         = labels.title,
            emoji         = labels.emoji,
            accent        = (Config.JobGroups[groupKey] or {}).color,
            jobLabel      = res.jobLabel,
            grade         = res.gradeLabel,
            members       = res.membersOnline,
            balance       = res.balance,
            balanceHidden = res.balanceHidden,
            isBoss        = res.isBoss,
        })
    end)
end

-----------------------------------------------------------
-- VOICE (pma-voice / Mumble)
-----------------------------------------------------------
local function pollVoice()
    local talking = MumbleIsPlayerTalking(PlayerId()) == true
    if talking ~= lastTalking then
        lastTalking = talking
        sendUI('voice', { talking = talking })
    end
end

-----------------------------------------------------------
-- V3.1: UI PREFERENCES -> NUI
-----------------------------------------------------------
local function sendConfig()
    local s = Config.Sounds or {}
    sendUI('config', {
        animate       = Config.AnimateNumbers ~= false,
        countUp       = Config.CountUpDuration or 650,
        autoScale     = Config.AutoScale ~= false,
        uiScale       = Config.UIScale or 1.0,
        minScale      = Config.MinScale or 0.75,
        maxScale      = Config.MaxScale or 1.35,
        reducedMotion = Config.ReducedMotion == true,
        colorblind    = Config.Colorblind == true,
        sounds = {
            enabled     = s.enabled ~= false,
            volume      = s.volume or 0.35,
            open        = s.open ~= false,
            close       = s.close ~= false,
            achievement = s.achievement ~= false,
        },
    })
end

-- push prefs once the NUI is up (resource start / player load)
CreateThread(function()
    Wait(1500)
    sendConfig()
end)

-----------------------------------------------------------
-- OPEN / CLOSE
-----------------------------------------------------------
local function openCard()
    if isOpen then return end
    isOpen = true
    if not statsLoaded then loadStats() end
    requestHeadshot()
    resolvePhone()
    sendConfig()
    sendUI('visibility', { visible = true })
    buildAndSend()
    refreshOnline()
    refreshSociety()
    lastTalking = nil
end

local function closeCard()
    if not isOpen then return end
    isOpen = false
    sendUI('visibility', { visible = false })
    releaseHeadshot()
end

-- main loops (only do work while the card is visible)
CreateThread(function()
    local dataAcc, onlineAcc = 0, 0
    local societyAcc = 0
    while true do
        if isOpen then
            local step = Config.VoicePollRate
            Wait(step)

            pollVoice()

            dataAcc = dataAcc + step
            if dataAcc >= Config.RefreshRate then
                dataAcc = 0
                buildAndSend()
            end

            onlineAcc = onlineAcc + step
            if onlineAcc >= Config.OnlineRefreshRate then
                onlineAcc = 0
                refreshOnline()
            end

            societyAcc = societyAcc + step
            if societyAcc >= (Config.SocietyRefreshRate or 8000) then
                societyAcc = 0
                refreshSociety()
            end
        else
            Wait(300)
        end
    end
end)

-----------------------------------------------------------
-- KEY MAPPING
-----------------------------------------------------------
if Config.Mode == 'hold' then
    RegisterCommand('+hexneyIdentity', function() openCard() end, false)
    RegisterCommand('-hexneyIdentity', function() closeCard() end, false)
    RegisterKeyMapping('+hexneyIdentity', 'Hold to show Identity Card', 'keyboard', Config.DefaultKey)
else
    RegisterCommand('hexneyIdentityToggle', function()
        if isOpen then closeCard() else openCard() end
    end, false)
    RegisterKeyMapping('hexneyIdentityToggle', 'Toggle Identity Card', 'keyboard', Config.DefaultKey)
end

-- hide card on resource stop to avoid a stuck overlay
AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() then
        sendUI('visibility', { visible = false })
        releaseHeadshot()
    end
end)

-----------------------------------------------------------
-- V3: EXPORTS (phone / external integrations)
-----------------------------------------------------------
-- exports['hexney_identity']:Open() / :Close() / :Toggle()
exports('Open',   function() openCard()  end)
exports('Close',  function() closeCard() end)
exports('Toggle', function()
    if isOpen then closeCard() else openCard() end
end)
exports('IsOpen', function() return isOpen end)
