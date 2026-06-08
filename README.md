# Identity Card 2026 (`hexney_identity`)

Egy prémium **karakterprofil overlay** FiveM-hez — nem egy újabb doboz-HUD.
GTA Online stílusú üveg-hatású (glassmorphism) játékoskártya, ami a karakterprofil
és a scoreboard keveréke.

![concept](docs/preview.png)

---

## ✨ Funkciók

### V1
- **Karakterkártya** – név, ID, munka, rang
- **Pénz** – készpénz + bank, ezres tagolással
- **SVG stat-gyűrűk** – HP, páncél, éhség, szomjúság (animált körök, nem csíkok)
- **Dinamikus accent** – a UI színe a munkához igazodik
  (Police = kék, EMS = piros, Mechanic = sárga, Civil = fehér)
- **Online panel** – valós idejű játékosszám munkacsoportonként + összesen
- **Mikrofon-vizualizáció** – beszéd közben animált sávok (pma-voice)
- **Luxus animációk** – becsúszás + scale + blur, fade helyett
- **Session + ping** kijelzés

### V2
- **Élő ped render** – a játékos karakterének valódi 3D fej-renderje az avatar
  helyén (natív `DrawSprite` a kártya fölött, pozícióban tartva)
- **Achievement rendszer** – konfigurálható kihívások, kioldási toast,
  perzisztált állapot játékosonként, badge-rács a kártyán
- **Órabér statisztika** – aktuális session nettó keresete + kivetített óradíj
- **Heti játékidő** – szerver oldalon perzisztált, heti bucketben (automatikus
  heti nullázás)

### V3 (új)
- **Telefon-integráció** – a telefonszám megjelenik a kártyán (lb-phone /
  qb-phone / gksphone / npwd auto-detektálás), és exportokkal a telefon-app is
  nyithatja a kártyát
- **Frakció statok** – frakció-munkáknál (police/ems) panel: online tagok,
  rang, és (boss grade-nek) a society egyenleg
- **Vállalkozás statok** – business-munkáknál (pl. mechanic) ugyanaz a panel
  „BUSINESS" címkével, a cég kasszájával

---

## 🧩 Függőségek

| Resource          | Kötelező | Megjegyzés                                       |
|-------------------|:--------:|--------------------------------------------------|
| `es_extended`     | ✅       | ESX Legacy (`getSharedObject`)                   |
| `esx_status`      | ⛅       | Éhség / szomjúság. Nélküle a gyűrűk 100%-on      |
| `pma-voice`       | ⛅       | Mikrofon-vizualizáció (Mumble natívok)           |
| `esx_addonaccount`| ⛅       | Frakció/vállalkozás kassza (society egyenleg)    |
| Telefon resource  | ⛅       | lb-phone / qb-phone / gksphone / npwd / Quasar v3 |

> ⛅ = soft dependency. Ha nincs telepítve, az adott funkció szépen kimarad,
> a resource nem dob hibát.

---

## 📦 Telepítés

1. Másold a mappát a szerver `resources` könyvtárába:
   ```
   resources/[hud]/hexney_identity
   ```
2. Add hozzá a `server.cfg`-hez:
   ```cfg
   ensure hexney_identity
   ```
3. Indítsd újra a szervert (vagy `refresh; ensure hexney_identity`).

---

## ⌨️ Használat

- Alapértelmezett gomb: **ALT** (bal Alt).
- `hold` módban a kártya csak addig látszik, amíg nyomva tartod (GTA Online stílus).
- A gombot a játékos átállíthatja: **FiveM → Settings → Key Bindings → FiveM**
  → „Hold to show Identity Card”.

---

## ⚙️ Konfiguráció (`config.lua`)

A legfontosabb beállítások:

```lua
Config.Brand      = 'HEXNEY'      -- kártya felirat
Config.Mode       = 'hold'        -- 'hold' vagy 'toggle'
Config.DefaultKey = 'LMENU'       -- bal ALT

Config.CashAccount = 'money'      -- ESX account a készpénzhez
Config.BankAccount = 'bank'       -- ESX account a bankhoz

Config.HungerStatus = 'hunger'    -- esx_status név (false = elrejt)
Config.ThirstStatus = 'thirst'
```

### Munkacsoportok és színek

Minden játék-munka egy csoporthoz tartozik. A csoport dönti el az accent színt,
az ikont és azt, melyik vödörbe számít az online panelen.

```lua
Config.JobGroups = {
    police   = { color = '#3b82f6', jobs = { 'police', 'sheriff', 'bcso' }, ... },
    ems      = { color = '#ef4444', jobs = { 'ambulance', 'ems' }, ... },
    mechanic = { color = '#f59e0b', jobs = { 'mechanic', 'bennys' }, ... },
    civil    = { color = '#e5e7eb', jobs = {} },  -- minden más ide esik
}
```

Új frakció hozzáadása: tedd a job nevét a megfelelő `jobs` listába,
vagy hozz létre egy új csoportot saját színnel és `order` értékkel.

---

## 💱 Pénznem formázás

A pénz a kliens oldalon `config.lua`-ban (`$`, `.` ezres tagoló) van beállítva,
és az `html/js/app.js` `formatMoney()` függvénye is ezt a stílust használja
(`125.000$`). Ha más pénznemet/elválasztót akarsz, mindkettőt állítsd át.

---

## 🎨 Stílus testreszabása (SCSS)

A `html/css/style.css` a kiszolgált fájl. A forrás a `style.scss`.
Ha SCSS-ből dolgozol, fordítsd újra:

```bash
sass html/css/style.scss html/css/style.css --no-source-map --style=expanded
```

A design tokenek (színek, radius, glass) a `:root` és az SCSS változók közt
vannak; az `--accent` változót a JS futásidőben felülírja a munka alapján.

---

## 🔎 Böngészős előnézet (fejlesztéshez)

A UI FiveM nélkül is megnézhető: nyisd meg a `html/index.html`-t egy böngészőben
`?preview=1` paraméterrel:

```
.../html/index.html?preview=1
```

Ez betölt egy minta-karaktert és kinyitja a kártyát, hogy lásd a layoutot
(átlátszó háttér miatt érdemes sötét háttér elé tenni).

---

## 🗺️ Roadmap (eladható verziók)

- **V1:** karakter, munka, pénz, hunger/thirst, online, voice
- **V2:** élő **ped render**, achievement rendszer, órabér- és
  heti játékidő-statisztika
- **V3 (ez):** telefon-integráció, frakció- és vállalkozás-statok

---

## 🧍 Ped render hangolása

A NUI (CEF) nem fér hozzá a játék textúráihoz, ezért a fej-rendert natívan,
`DrawSprite`-tal rajzoljuk a kártya fölé, az avatar slot helyére. A pozíciót
felbontás/safezone szerint finomhangolni kell a `config.lua`-ban:

```lua
Config.PedRender = {
    enabled = true,
    x = 0.158,  -- vízszintes közép (0..1)
    y = 0.330,  -- függőleges közép (0..1)
    w = 0.052,  -- szélesség
    h = 0.092,  -- magasság
}
```

A defaultok 1920×1080-ra hangoltak. Ha a render nem fedi pontosan az avatar
keretet, állítsd az `x`/`y` értékeket apró lépésekben. `enabled = false` esetén
a munka-emoji marad az avatarban.

---

## 🏆 Achievementek

Az achievementek a `config.lua`-ban definiáltak, és kliens oldalon értékelődnek
ki egy `check(ctx)` függvénnyel. A `ctx` tartalmazza a pénzt, session/heti időt,
munkacsoportot és a statokat. Kioldáskor toast jelenik meg, az állapot pedig
játékosonként perzisztálódik a szerveren (`data/stats.json`).

Új achievement:

```lua
{ id = 'cop_legend', label = 'Veteran', emoji = '\u{1F3C5}',
  desc = 'Play 50 hours this week as Police',
  check = function(ctx)
      return ctx.jobGroup == 'police' and ctx.weeklySeconds >= 50 * 3600
  end },
```

> A szerver csak a `config.lua`-ban létező `id`-kat fogadja el kioldásként,
> így a kliensből nem lehet tetszőleges bejegyzést írni.

---

## 📱 Telefon-integráció

A telefonszám automatikusan megjelenik a kártyán, ha elérhető. A provider
auto-detektált (`Config.PhoneProvider = 'auto'`):

- **Kliens-oldali** (azonnali): `lb-phone` → `qb-phone` → `gksphone` → `npwd`
- **Szerver-oldali** (callback): **Quasar Smartphone v3** (`qs-smartphone` /
  `qs-base` `GetPlayerPhone(source)` exportja)

Az `'auto'` előbb a kliens-oldali telefonokat próbálja, majd ha nincs találat,
a szervertől kéri le (Quasar). Konkrét providerre rögzíthető
(`'lb-phone'`, `'quasar'`, stb.), vagy `false` esetén a telefon-sor rejtve marad.
A Quasar resource neve a `Config.QuasarResources` listában állítható.

A kártya kívülről (pl. egy telefon-appból) is nyitható exportokkal:

```lua
exports['hexney_identity']:Open()      -- megnyitja
exports['hexney_identity']:Close()     -- bezárja
exports['hexney_identity']:Toggle()    -- vált
exports['hexney_identity']:IsOpen()    -- boolean
```

---

## 🛡️ Frakció / 🏢 Vállalkozás statok

Ha a játékos egy frakció- vagy business-munkában van, az online panel alatt
megjelenik egy society panel: **online tagok**, **rang**, és (jogosultság esetén)
a **society egyenleg**.

A besorolás a munka-CSOPORT alapján történik:

```lua
Config.SocietyKind = {
    police   = 'faction',
    ems      = 'faction',
    mechanic = 'business',
}
```

Az egyenleg az `esx_addonaccount` shared accountból olvasódik
(`society_<job>`). Alapból csak **boss grade** látja az összeget
(`Config.SocietyBossOnly = true`); a többi tagnak `••••••` jelenik meg.
A boss-t a grade neve (`Config.SocietyBossGrades`) vagy a numerikus szint
(`Config.SocietyBossGradeLevel`) alapján ismerjük fel.

> Ha az `esx_addonaccount` nincs telepítve, az egyenleg egyszerűen kimarad,
> a tagszám és a rang viszont továbbra is működik.

---

## 💾 Adatperzisztálás

A heti játékidő és a kioldott achievementek a `data/stats.json` fájlban
tárolódnak (identifier szerint). A fájl mentése debounce-olt; a szerver
leállásakor és lecsatlakozáskor is flush-öl. Adatbázis-háttér nem szükséges.

---

## 🧠 Technológia

HTML · SCSS · Vanilla JS (NUI) · ESX Legacy · esx_status · pma-voice ·
esx_addonaccount · lb-phone / qb-phone / gksphone / npwd

Nincs build kötelezettség: a CSS előfordítva van, a JS dependency-mentes.
