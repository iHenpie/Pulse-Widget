// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: magic;
// Pulse — Scriptable Large Widget
// Version 1.2
//
// Features
// - Automatic Morning / Work / Evening / Night layouts
// - Weekday Work profile, otherwise Personal
// - Fluid grouped settings menu
// - Solid and gradient background presets
// - Custom background colour support
// - Configurable Calendar and Reminder selections
// - Local weather using Open-Meteo
// - Dynamic SF Symbol weather graphic
// - Fasting progress
// - Evening Activity summary from a companion Shortcut
// - Commute summary from a companion Shortcut
//
// Companion Shortcut files expected in:
// iCloud Drive/Scriptable/pulse-health.json
// iCloud Drive/Scriptable/pulse-commute.json
// iCloud Drive/Scriptable/pulse-alarm.json
//
// Health JSON example:
// {
//   "date": "2026-07-20",
//   "steps": 8642,
//   "move": 487,
//   "moveGoal": 600,
//   "exercise": 24,
//   "exerciseGoal": 30,
//   "updatedAt": 1784563200000
// }
//
// Commute JSON example:
// {
//   "destination": "work",
//   "label": "Work",
//   "travelMinutes": 34,
//   "arrivalTime": "08:12",
//   "distanceMiles": 18.6,
//   "traffic": "Moderate traffic",
//   "mapsURL": "https://maps.apple.com/?daddr=...",
//   "updatedAt": 1784563200000
// }

const fm = FileManager.local()
const icloud = FileManager.iCloud()

const SETTINGS_PATH = fm.joinPath(fm.libraryDirectory(), "pulse-settings.json")
const WEATHER_CACHE_PATH = fm.joinPath(fm.libraryDirectory(), "pulse-weather-cache.json")
const HEALTH_PATH = icloud.joinPath(icloud.documentsDirectory(), "pulse-health.json")
const HEALTH_FALLBACK_PATHS = [
  icloud.joinPath(icloud.documentsDirectory(), "pulse-health.txt"),
  icloud.joinPath(icloud.documentsDirectory(), "Scriptable/pulse-health.json"),
  icloud.joinPath(icloud.documentsDirectory(), "Scriptable/pulse-health.txt")
]
const COMMUTE_PATH = icloud.joinPath(icloud.documentsDirectory(), "pulse-commute.json")
const ALARM_PATH = icloud.joinPath(icloud.documentsDirectory(), "pulse-alarm.json")
const ALARM_FALLBACK_PATHS = [
  icloud.joinPath(icloud.documentsDirectory(), "pulse-alarm.txt"),
  icloud.joinPath(icloud.documentsDirectory(), "Scriptable/pulse-alarm.json"),
  icloud.joinPath(icloud.documentsDirectory(), "Scriptable/pulse-alarm.txt")
]

const APP_URLS = {
  healthSync: "shortcuts://run-shortcut?name=Pulse%20Sync",
  alarmSync: "shortcuts://run-shortcut?name=Pulse%20Sync",
  weather: "weather://",
  calendar: "calshow://",
  reminders: "x-apple-reminderkit://",
  maps: "maps://",
  clock: "clock-alarm://"
}

const MORNING_ENCOURAGEMENT = [
  "Start small. Keep moving.",
  "Today only needs your next right step.",
  "Set the tone gently.",
  "You have time to build the day.",
  "Do the simple thing first.",
  "A steady morning changes everything.",
  "Begin where you are.",
  "Make today a little lighter."
]

const NIGHT_WISDOM = [
  "Rest is part of the work.",
  "You can leave today here.",
  "Small steps still count.",
  "Tomorrow gets a fresh page.",
  "The day is done. Let it be enough.",
  "Quiet progress is still progress.",
  "You handled more than you think.",
  "Sleep first. Solve later."
]

const NIGHT_CONGRATS = [
  "Nice work today. You earned the rest.",
  "That was a strong day.",
  "Goals moved. Time to switch off.",
  "Good effort today. Let your body catch up.",
  "You showed up. That counts.",
  "Progress banked. Rest now."
]

const DEFAULTS = {
  setupComplete: false,
  userName: "",
  homeLocation: "",
  workLocation: "",
  workdays: [1, 2, 3, 4, 5],

  workCalendarIdentifiers: [],
  workReminderIdentifiers: [],
  personalCalendarIdentifiers: [],
  personalReminderIdentifiers: [],

  showWeather: true,
  showFasting: true,
  showEvents: true,
  showReminders: true,
  showHealth: true,
  showCommute: true,
  showAllDayEvents: true,

  eventCount: 2,
  reminderCount: 2,

  fastingStartHour: 20,
  fastingStartMinute: 0,
  fastingEndHour: 12,
  fastingEndMinute: 0,

  morningStartHour: 5,
  morningStartMinute: 30,
  workStartHour: 7,
  workStartMinute: 30,
  workEndHour: 17,
  workEndMinute: 0,
  eveningEndHour: 22,
  eveningEndMinute: 30,

  commuteMorningStartHour: 6,
  commuteMorningStartMinute: 15,
  commuteMorningEndHour: 9,
  commuteMorningEndMinute: 0,
  commuteEveningStartHour: 15,
  commuteEveningStartMinute: 30,
  commuteEveningEndHour: 19,
  commuteEveningEndMinute: 0,
  commuteMaxAgeMinutes: 45,
  eventCommuteLookaheadMinutes: 180,
  commuteMinDistanceMiles: 0.5,
  commuteMinTravelMinutes: 10,
  preferredTransport: "driving",

  temperatureUnit: "celsius",
  weatherCacheMinutes: 30,
  refreshMinutes: 5,

  backgroundStyle: "personal",
  backgroundPreset: "personal-glow",
  background: "#0F0F10",
  backgroundSecondary: "#24252B",
  cardBackground: "#1C1C1E",
  primaryText: "#FFFFFF",
  secondaryText: "#A1A1A6",
  divider: "#2C2C2E",
  progressBackground: "#3A3A3C",
  accent: "#FFFFFF",
  overdue: "#FF6961"
}

let settings = loadSettings()

if (config.runsInWidget) {
  const widget = await createWidget()
  Script.setWidget(widget)
  Script.complete()
} else {
  if (!settings.setupComplete) await initialSetup()
  await openSettings()
  Script.complete()
}

// MARK: - Settings

async function initialSetup(manual = false) {
  const start = new Alert()
  start.title = manual ? "Initial Setup" : "Welcome to Pulse"
  start.message = [
    "This will walk through the core Pulse settings:",
    "",
    "Personal details, working days, dashboard times, fasting, calendars, reminders, and checks."
  ].join("\n")
  start.addAction("Start")
  if (manual) start.addCancelAction("Cancel")
  else start.addAction("Skip for Now")

  const startChoice = await start.presentAlert()
  if (startChoice === -1 || (!manual && startChoice === 1)) {
    if (!manual) {
      settings.setupComplete = true
      saveSettings()
    }
    return
  }

  await personalSettings()
  await workingDaysSettings()
  await dashboardScheduleSettings()
  await setupFastingStep()
  await dataSourceSettings()
  await setupChecksStep()
  await setupPreviewStep()

  settings.setupComplete = true
  saveSettings()
  await showMessage("Pulse Setup Complete", "You can run this again from Settings > Initial Setup.")
}

async function setupFastingStep() {
  const alert = new Alert()
  alert.title = "Fasting"
  alert.message = "Do you want Pulse to show your fasting timer?"
  alert.addAction(settings.showFasting ? "Keep Fasting On" : "Turn Fasting On")
  alert.addAction("Turn Fasting Off")
  alert.addAction("Edit Fasting Window")
  alert.addCancelAction("Skip")

  const choice = await alert.presentSheet()
  if (choice === 0) {
    settings.showFasting = true
    saveSettings()
  } else if (choice === 1) {
    settings.showFasting = false
    saveSettings()
  } else if (choice === 2) {
    settings.showFasting = true
    saveSettings()
    await fastingSettings()
  }
}

async function setupChecksStep() {
  const alert = new Alert()
  alert.title = "Checks"
  alert.message = "Run checks now to confirm location, travel, weather, Health, and alarm companion files."
  alert.addAction("Run Checks")
  alert.addCancelAction("Skip")

  if (await alert.presentSheet() === 0) {
    await checkPermissionsAndTravel()
    await checkHealthSync()
  }
}

async function setupPreviewStep() {
  const alert = new Alert()
  alert.title = "Preview"
  alert.message = "Preview Pulse now?"
  alert.addAction("Preview Current")
  alert.addCancelAction("Finish")

  if (await alert.presentSheet() === 0) await (await createWidget()).presentLarge()
}

async function openSettings() {
  if (typeof UITable !== "undefined") {
    await openSettingsTable()
    return
  }

  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Pulse"
    alert.message = [
      `${modeLabel(getDashboardMode())}`,
      settings.userName ? `Name: ${settings.userName}` : "Name not set",
      `Refresh request: ${settings.refreshMinutes} min`,
      `Background: ${backgroundStyleLabel()}`,
      "",
      "Choose a section to customise."
    ].join("\n")

    alert.addAction("Initial Setup")
    alert.addAction("Appearance")
    alert.addAction("Personal")
    alert.addAction("Calendars and Reminders")
    alert.addAction("Content")
    alert.addAction("Schedules")
    alert.addAction("Weather and Refresh")
    alert.addAction("Preview")
    alert.addDestructiveAction("Reset Everything")
    alert.addCancelAction("Done")

    const choice = await alert.presentSheet()

    if (choice === 0) await initialSetup(true)
    else if (choice === 1) await appearanceSettings()
    else if (choice === 2) await personalSettings()
    else if (choice === 3) await dataSourceSettings()
    else if (choice === 4) await contentSettings()
    else if (choice === 5) await scheduleSettings()
    else if (choice === 6) await refreshWeatherSettings()
    else if (choice === 7) await previewSettings()
    else if (choice === 8) await resetSettings()
    else open = false
  }
}

async function openSettingsTable() {
  const table = new UITable()
  table.showSeparators = true

  function reload() {
    table.removeAllRows()

    const header = new UITableRow()
    header.isHeader = true
    header.addText("Pulse", [
      modeLabel(getDashboardMode()),
      settings.userName ? `Name: ${settings.userName}` : "Name not set",
      backgroundStyleLabel()
    ].join(" · "))
    table.addRow(header)

    table.addRow(settingsSectionRow("Setup"))
    table.addRow(tableActionRow("Initial Setup", "Run the guided setup again", false, async () => {
      await initialSetup(true)
    }))

    table.addRow(settingsSectionRow("Personalisation"))
    table.addRow(tableActionRow("Personal", personalSettingsSummary(), false, async () => {
      await personalSettings()
    }))
    table.addRow(tableActionRow("Appearance", backgroundStyleLabel(), false, async () => {
      await appearanceSettings()
    }))

    table.addRow(settingsSectionRow("Sources"))
    table.addRow(tableActionRow("Calendars and Reminders", dataSourceSummary(), false, async () => {
      await dataSourceSettings()
    }))
    table.addRow(tableActionRow("Content", contentSettingsSummary(), false, async () => {
      await contentSettings()
    }))

    table.addRow(settingsSectionRow("Timing"))
    table.addRow(tableActionRow("Schedules", scheduleSettingsSummary(), false, async () => {
      await scheduleSettings()
    }))
    table.addRow(tableActionRow("Weather and Refresh", weatherSettingsSummary(), false, async () => {
      await refreshWeatherSettings()
    }))

    table.addRow(settingsSectionRow("Preview"))
    table.addRow(tableActionRow("Preview", "View Morning, Work, Day Off, Evening, or Night", false, async () => {
      await previewSettings()
    }))

    table.addRow(settingsSectionRow("Advanced"))
    table.addRow(tableActionRow("Reset Everything", "Restore defaults and rerun setup", false, async () => {
      await resetSettings()
      reload()
    }))
    table.addRow(tableActionRow("Done", "", true, () => {}))

    table.reload()
  }

  reload()
  await table.present(false)
}

async function dataSourceSettings() {
  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Calendars and Reminders"
    alert.message = "Choose which sources Pulse uses in Work and Personal mode."

    alert.addAction("Work Calendars")
    alert.addAction("Work Reminder Lists")
    alert.addAction("Personal Calendars")
    alert.addAction("Personal Reminder Lists")
    alert.addCancelAction("Back")

    const choice = await alert.presentSheet()

    if (choice === 0) await selectCalendars("work")
    else if (choice === 1) await selectReminderLists("work")
    else if (choice === 2) await selectCalendars("personal")
    else if (choice === 3) await selectReminderLists("personal")
    else open = false
  }
}

async function previewSettings() {
  const modes = [
    ["Morning", "morning"],
    ["Work", "work"],
    ["Day Off", "dayOff"],
    ["Evening", "evening"],
    ["Night", "night"],
    ["Current", null]
  ]

  const alert = new Alert()
  alert.title = "Preview"
  alert.message = "Choose which Pulse layout to preview."
  modes.forEach(([label]) => alert.addAction(label))
  alert.addCancelAction("Back")

  const choice = await alert.presentSheet()
  if (choice === -1) return

  const mode = modes[choice][1]
  await (await createWidget(mode)).presentLarge()
}

async function personalSettings() {
  const alert = new Alert()
  alert.title = "Personal"
  alert.message = "Add your name and regular places so Pulse can personalise greetings and travel details."
  alert.addTextField("Name", settings.userName || "")
  alert.addTextField("Home location", settings.homeLocation || "")
  alert.addTextField("Work location", settings.workLocation || "")
  alert.addAction("Save")
  alert.addAction("Clear Name")
  alert.addAction("Clear Locations")
  alert.addCancelAction("Cancel")

  const choice = await alert.presentAlert()
  if (choice === -1) return

  if (choice === 0) {
    settings.userName = alert.textFieldValue(0).trim()
    settings.homeLocation = alert.textFieldValue(1).trim()
    settings.workLocation = alert.textFieldValue(2).trim()
  }
  else if (choice === 1) settings.userName = ""
  else if (choice === 2) {
    settings.homeLocation = ""
    settings.workLocation = ""
  }
  saveSettings()
}

async function scheduleSettings() {
  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Schedules"
    alert.message = "Manage when each dashboard and feature appears."

    alert.addAction("Fasting Window")
    alert.addAction("Dashboard Times")
    alert.addAction("Working Days")
    alert.addAction("Commute Times")
    alert.addCancelAction("Back")

    const choice = await alert.presentSheet()

    if (choice === 0) await fastingSettings()
    else if (choice === 1) await dashboardScheduleSettings()
    else if (choice === 2) await workingDaysSettings()
    else if (choice === 3) await commuteScheduleSettings()
    else open = false
  }
}

async function appearanceSettings() {
  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Appearance"
    alert.message = `Current background: ${backgroundStyleLabel()}`

    alert.addAction("Choose Background")
    alert.addAction("Custom Solid Colour")
    alert.addAction("Custom Gradient")
    alert.addAction("Preview Widget")
    alert.addAction("Restore Default Appearance")
    alert.addCancelAction("Back")

    const choice = await alert.presentSheet()

    if (choice === 0) await chooseBackgroundPreset()
    else if (choice === 1) await customSolidBackground()
    else if (choice === 2) await customGradientBackground()
    else if (choice === 3) await previewSettings()
    else if (choice === 4) {
      settings.backgroundStyle = DEFAULTS.backgroundStyle
      settings.backgroundPreset = DEFAULTS.backgroundPreset
      settings.background = DEFAULTS.background
      settings.backgroundSecondary = DEFAULTS.backgroundSecondary
      settings.cardBackground = DEFAULTS.cardBackground
      settings.primaryText = DEFAULTS.primaryText
      settings.secondaryText = DEFAULTS.secondaryText
      settings.divider = DEFAULTS.divider
      settings.progressBackground = DEFAULTS.progressBackground
      settings.accent = DEFAULTS.accent
      saveSettings()
    } else {
      open = false
    }
  }
}

async function chooseBackgroundPreset() {
  const presets = [
    {name: "Personal Glow", style: "personal", first: "#0F0F10", second: "#24252B", card: "#1C1C1E"},
    {name: "Midnight", style: "solid", first: "#0F0F10", second: "#24252B", card: "#1C1C1E"},
    {name: "Graphite", style: "gradient", first: "#0F1115", second: "#2B313B", card: "#20242B"},
    {name: "Ocean", style: "gradient", first: "#071C2C", second: "#124B69", card: "#103247"},
    {name: "Indigo", style: "gradient", first: "#14132A", second: "#39366D", card: "#29264D"},
    {name: "Forest", style: "gradient", first: "#0B2119", second: "#24513C", card: "#183A2B"},
    {name: "Burgundy", style: "gradient", first: "#2A1016", second: "#63303B", card: "#47212A"},
    {name: "Warm Dusk", style: "gradient", first: "#2A1722", second: "#6A3B43", card: "#492A32"},
    {name: "Pure Black", style: "solid", first: "#000000", second: "#000000", card: "#171717"}
  ]

  const alert = new Alert()
  alert.title = "Choose Background"

  for (const preset of presets) {
    const selected = settings.backgroundPreset === preset.name.toLowerCase().replace(/ /g, "-")
    alert.addAction(`${selected ? "✓ " : ""}${preset.name}`)
  }

  alert.addCancelAction("Cancel")
  const choice = await alert.presentSheet()
  if (choice === -1) return

  const selected = presets[choice]
  settings.backgroundStyle = selected.style
  settings.backgroundPreset = selected.name.toLowerCase().replace(/ /g, "-")
  settings.background = selected.first
  settings.backgroundSecondary = selected.second
  settings.cardBackground = selected.card
  saveSettings()
}

async function customSolidBackground() {
  const alert = new Alert()
  alert.title = "Custom Solid Colour"
  alert.message = "Enter a six-digit hex colour, for example #152238."
  alert.addTextField("Background colour", settings.background)
  alert.addAction("Save")
  alert.addCancelAction("Cancel")

  const choice = await alert.presentAlert()
  if (choice === -1) return

  const colour = normaliseHex(alert.textFieldValue(0))
  if (!colour) {
    await showMessage("Invalid colour", "Use a six-digit hex colour such as #152238.")
    return
  }

  settings.backgroundStyle = "solid"
  settings.backgroundPreset = "custom"
  settings.background = colour
  settings.backgroundSecondary = colour
  saveSettings()
}

async function customGradientBackground() {
  const alert = new Alert()
  alert.title = "Custom Gradient"
  alert.message = "Enter two six-digit hex colours."
  alert.addTextField("Top colour", settings.background)
  alert.addTextField("Bottom colour", settings.backgroundSecondary)
  alert.addAction("Save")
  alert.addCancelAction("Cancel")

  const choice = await alert.presentAlert()
  if (choice === -1) return

  const first = normaliseHex(alert.textFieldValue(0))
  const second = normaliseHex(alert.textFieldValue(1))

  if (!first || !second) {
    await showMessage("Invalid colours", "Use six-digit hex colours such as #152238.")
    return
  }

  settings.backgroundStyle = "gradient"
  settings.backgroundPreset = "custom-gradient"
  settings.background = first
  settings.backgroundSecondary = second
  saveSettings()
}

async function selectCalendars(profile) {
  try {
    const calendars = await Calendar.forEvents()
    const key = profile === "work" ? "workCalendarIdentifiers" : "personalCalendarIdentifiers"
    const title = profile === "work" ? "Work Calendars" : "Personal Calendars"
    const selected = await multiSelect(title, calendars, settings[key])
    if (selected !== null) {
      settings[key] = selected
      saveSettings()
    }
  } catch (error) {
    await showMessage("Calendar access failed", String(error))
  }
}

async function selectReminderLists(profile) {
  try {
    const calendars = await Calendar.forReminders()
    const key = profile === "work" ? "workReminderIdentifiers" : "personalReminderIdentifiers"
    const title = profile === "work" ? "Work Reminder Lists" : "Personal Reminder Lists"
    const selected = await multiSelect(title, calendars, settings[key])
    if (selected !== null) {
      settings[key] = selected
      saveSettings()
    }
  } catch (error) {
    await showMessage("Reminder access failed", String(error))
  }
}

async function multiSelect(title, calendars, existing) {
  if (typeof UITable !== "undefined") return await multiSelectTable(title, calendars, existing)
  return await multiSelectAlert(title, calendars, existing)
}

async function multiSelectAlert(title, calendars, existing) {
  let selected = [...(existing || [])]

  while (true) {
    const alert = new Alert()
    alert.title = title
    alert.message = "No selections means all calendars or lists."

    for (const calendar of calendars) {
      const checked = selected.includes(calendar.identifier)
      alert.addAction(`${checked ? "✓" : "○"} ${calendar.title}`)
    }

    alert.addAction("Select all")
    alert.addAction("Clear all")
    alert.addAction("Save")
    alert.addCancelAction("Cancel")

    const choice = await alert.presentSheet()
    if (choice === -1) return null

    if (choice < calendars.length) {
      const id = calendars[choice].identifier
      selected = selected.includes(id)
        ? selected.filter(item => item !== id)
        : [...selected, id]
    } else if (choice === calendars.length) {
      selected = calendars.map(calendar => calendar.identifier)
    } else if (choice === calendars.length + 1) {
      selected = []
    } else {
      return selected
    }
  }
}

async function multiSelectTable(title, calendars, existing) {
  let selected = [...(existing || [])]
  let result = null
  const table = new UITable()
  table.showSeparators = true

  function reload() {
    table.removeAllRows()

    const header = new UITableRow()
    header.isHeader = true
    header.addText(title, "No selections means all calendars or lists.")
    table.addRow(header)

    for (const calendar of calendars) {
      const row = new UITableRow()
      row.dismissOnSelect = false
      row.addText(`${selected.includes(calendar.identifier) ? "✓" : "○"} ${calendar.title}`)
      row.onSelect = () => {
        selected = selected.includes(calendar.identifier)
          ? selected.filter(item => item !== calendar.identifier)
          : [...selected, calendar.identifier]
        reload()
      }
      table.addRow(row)
    }

    table.addRow(tableActionRow("Select all", false, () => {
      selected = calendars.map(calendar => calendar.identifier)
      reload()
    }))
    table.addRow(tableActionRow("Clear all", false, () => {
      selected = []
      reload()
    }))
    table.addRow(tableActionRow("Save", true, () => {
      result = [...selected]
    }))
    table.addRow(tableActionRow("Cancel", true, () => {
      result = null
    }))

    table.reload()
  }

  reload()
  await table.present(false)
  return result
}

async function contentSettings() {
  if (typeof UITable !== "undefined") {
    await contentSettingsTable()
    return
  }

  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Content"

    const options = [
      ["Weather graphic", "showWeather"],
      ["Fasting", "showFasting"],
      ["Calendar events", "showEvents"],
      ["Reminders", "showReminders"],
      ["Evening Activity", "showHealth"],
      ["Commute", "showCommute"],
      ["All-day events", "showAllDayEvents"]
    ]

    for (const [label, key] of options) {
      alert.addAction(`${settings[key] ? "✓" : "○"} ${label}`)
    }

    alert.addAction(`Events shown: ${settings.eventCount}`)
    alert.addAction(`Reminders shown: ${settings.reminderCount}`)
    alert.addCancelAction("Back")

    const choice = await alert.presentSheet()

    if (choice >= 0 && choice < options.length) {
      const key = options[choice][1]
      settings[key] = !settings[key]
      saveSettings()
    } else if (choice === options.length) {
      settings.eventCount = await chooseCount("Events shown", settings.eventCount, 1, 3)
      saveSettings()
    } else if (choice === options.length + 1) {
      settings.reminderCount = await chooseCount("Reminders shown", settings.reminderCount, 1, 3)
      saveSettings()
    } else {
      open = false
    }
  }
}

async function contentSettingsTable() {
  const options = [
    ["Weather graphic", "showWeather"],
    ["Fasting", "showFasting"],
    ["Calendar events", "showEvents"],
    ["Reminders", "showReminders"],
    ["Evening Activity", "showHealth"],
    ["Commute", "showCommute"],
    ["All-day events", "showAllDayEvents"]
  ]

  const table = new UITable()
  table.showSeparators = true

  function reload() {
    table.removeAllRows()

    const header = new UITableRow()
    header.isHeader = true
    header.addText("Content", "Tap rows to toggle without leaving this screen.")
    table.addRow(header)

    for (const [label, key] of options) {
      table.addRow(tableActionRow(`${settings[key] ? "✓" : "○"} ${label}`, false, () => {
        settings[key] = !settings[key]
        saveSettings()
        reload()
      }))
    }

    table.addRow(tableActionRow(`Events shown: ${settings.eventCount}`, false, async () => {
      settings.eventCount = await chooseCount("Events shown", settings.eventCount, 1, 3)
      saveSettings()
      reload()
    }))
    table.addRow(tableActionRow(`Reminders shown: ${settings.reminderCount}`, false, async () => {
      settings.reminderCount = await chooseCount("Reminders shown", settings.reminderCount, 1, 3)
      saveSettings()
      reload()
    }))
    table.addRow(tableActionRow("Back", true, () => {}))

    table.reload()
  }

  reload()
  await table.present(false)
}

function settingsSectionRow(title) {
  const row = new UITableRow()
  row.isHeader = true
  row.addText(title)
  return row
}

function tableActionRow(title, subtitle = "", dismissOnSelect, onSelect) {
  if (typeof subtitle === "boolean") {
    onSelect = dismissOnSelect
    dismissOnSelect = subtitle
    subtitle = ""
  }

  const row = new UITableRow()
  row.dismissOnSelect = dismissOnSelect
  row.addText(title, subtitle)
  row.onSelect = onSelect
  return row
}

function personalSettingsSummary() {
  const parts = []
  parts.push(settings.userName ? settings.userName : "Name not set")
  if (settings.homeLocation) parts.push("Home set")
  if (settings.workLocation) parts.push("Work set")
  return parts.join(" · ")
}

function dataSourceSummary() {
  const work = settings.workCalendarIdentifiers.length || "All"
  const personal = settings.personalCalendarIdentifiers.length || "All"
  return `Work calendars: ${work} · Personal calendars: ${personal}`
}

function contentSettingsSummary() {
  const enabled = [
    settings.showWeather && "Weather",
    settings.showHealth && "Health",
    settings.showFasting && "Fasting",
    settings.showEvents && "Events",
    settings.showReminders && "Reminders"
  ].filter(Boolean)
  return enabled.join(" · ") || "Everything hidden"
}

function scheduleSettingsSummary() {
  return `${formatSettingsTime(settings.workStartHour, settings.workStartMinute)}-${formatSettingsTime(settings.workEndHour, settings.workEndMinute)} · ${workingDaysSummary()} · ${transportLabel(settings.preferredTransport)}`
}

function weatherSettingsSummary() {
  return `${settings.temperatureUnit === "fahrenheit" ? "Fahrenheit" : "Celsius"} · refresh ${settings.refreshMinutes} min`
}

function workingDaysSummary() {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const days = Array.isArray(settings.workdays) ? settings.workdays : DEFAULTS.workdays
  return days.map(day => labels[Number(day)]).filter(Boolean).join(", ")
}

async function chooseCount(title, current, min, max) {
  const alert = new Alert()
  alert.title = title
  for (let value = min; value <= max; value++) {
    alert.addAction(`${value === current ? "✓ " : ""}${value}`)
  }
  alert.addCancelAction("Cancel")
  const choice = await alert.presentSheet()
  return choice === -1 ? current : min + choice
}

async function fastingSettings() {
  const values = await timeFields(
    "Fasting Schedule",
    "Use 24-hour time.",
    [
      ["Fast begins", settings.fastingStartHour, settings.fastingStartMinute],
      ["Fast ends", settings.fastingEndHour, settings.fastingEndMinute]
    ]
  )
  if (!values) return

  settings.fastingStartHour = values[0].hour
  settings.fastingStartMinute = values[0].minute
  settings.fastingEndHour = values[1].hour
  settings.fastingEndMinute = values[1].minute
  saveSettings()
}

async function dashboardScheduleSettings() {
  const values = await timeFields(
    "Dashboard Schedule",
    "Work mode only applies on your selected working days.",
    [
      ["Morning begins", settings.morningStartHour, settings.morningStartMinute],
      ["Work begins", settings.workStartHour, settings.workStartMinute],
      ["Work ends", settings.workEndHour, settings.workEndMinute],
      ["Evening ends", settings.eveningEndHour, settings.eveningEndMinute]
    ]
  )
  if (!values) return

  settings.morningStartHour = values[0].hour
  settings.morningStartMinute = values[0].minute
  settings.workStartHour = values[1].hour
  settings.workStartMinute = values[1].minute
  settings.workEndHour = values[2].hour
  settings.workEndMinute = values[2].minute
  settings.eveningEndHour = values[3].hour
  settings.eveningEndMinute = values[3].minute
  saveSettings()
}

async function workingDaysSettings() {
  const days = [
    ["Sunday", 0],
    ["Monday", 1],
    ["Tuesday", 2],
    ["Wednesday", 3],
    ["Thursday", 4],
    ["Friday", 5],
    ["Saturday", 6]
  ]
  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Working Days"
    alert.message = "Choose the days Pulse should treat as workdays."

    for (const [label, value] of days) {
      alert.addAction(`${isWorkdayNumber(value) ? "✓" : "○"} ${label}`)
    }
    alert.addAction("Monday to Friday")
    alert.addCancelAction("Back")

    const choice = await alert.presentSheet()
    if (choice === -1) {
      open = false
    } else if (choice < days.length) {
      const value = days[choice][1]
      const selected = new Set(settings.workdays || DEFAULTS.workdays)
      selected.has(value) ? selected.delete(value) : selected.add(value)
      settings.workdays = [...selected].sort()
      saveSettings()
    } else {
      settings.workdays = [...DEFAULTS.workdays]
      saveSettings()
    }
  }
}

async function commuteScheduleSettings() {
  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Commute"
    alert.message = "Control when commute appears and how travel estimates are calculated."
    alert.addAction("Display Times")
    alert.addAction(`Transport: ${transportLabel(settings.preferredTransport)}`)
    alert.addAction(`Show commute over ${settings.commuteMinTravelMinutes} min`)
    alert.addCancelAction("Back")

    const choice = await alert.presentSheet()
    if (choice === 0) await commuteDisplayTimesSettings()
    else if (choice === 1) await preferredTransportSettings()
    else if (choice === 2) await commuteDistanceThresholdSettings()
    else open = false
  }
}

async function commuteDisplayTimesSettings() {
  const values = await timeFields(
    "Commute Display Schedule",
    "Commute data only appears during these windows on working days.",
    [
      ["Morning starts", settings.commuteMorningStartHour, settings.commuteMorningStartMinute],
      ["Morning ends", settings.commuteMorningEndHour, settings.commuteMorningEndMinute],
      ["Evening starts", settings.commuteEveningStartHour, settings.commuteEveningStartMinute],
      ["Evening ends", settings.commuteEveningEndHour, settings.commuteEveningEndMinute]
    ]
  )
  if (!values) return

  settings.commuteMorningStartHour = values[0].hour
  settings.commuteMorningStartMinute = values[0].minute
  settings.commuteMorningEndHour = values[1].hour
  settings.commuteMorningEndMinute = values[1].minute
  settings.commuteEveningStartHour = values[2].hour
  settings.commuteEveningStartMinute = values[2].minute
  settings.commuteEveningEndHour = values[3].hour
  settings.commuteEveningEndMinute = values[3].minute
  saveSettings()
}

async function preferredTransportSettings() {
  const options = [
    ["Driving", "driving"],
    ["Walking", "walking"],
    ["Cycling", "cycling"]
  ]
  const alert = new Alert()
  alert.title = "Preferred Transport"
  for (const [label, value] of options) {
    alert.addAction(`${settings.preferredTransport === value ? "✓ " : ""}${label}`)
  }
  alert.addCancelAction("Cancel")

  const choice = await alert.presentSheet()
  if (choice === -1) return
  settings.preferredTransport = options[choice][1]
  saveSettings()
}

async function commuteDistanceThresholdSettings() {
  const alert = new Alert()
  alert.title = "Commute Threshold"
  alert.message = "Show commute time only when the journey is longer than this. The event card still appears either way."
  alert.addTextField("Minimum minutes", String(settings.commuteMinTravelMinutes || 10))
  alert.addAction("Save")
  alert.addCancelAction("Cancel")

  if (await alert.presentAlert() !== 0) return
  const minutes = Number(alert.textFieldValue(0))
  if (!Number.isFinite(minutes) || minutes < 0) {
    await showMessage("Invalid Time", "Enter a number of minutes, for example 10.")
    return
  }
  settings.commuteMinTravelMinutes = minutes
  saveSettings()
}

async function timeFields(title, message, fields) {
  const alert = new Alert()
  alert.title = title
  alert.message = message

  for (const [label, hour, minute] of fields) {
    alert.addTextField(label, formatSettingsTime(hour, minute))
  }

  alert.addAction("Save")
  alert.addCancelAction("Cancel")

  const choice = await alert.presentAlert()
  if (choice === -1) return null

  const values = fields.map((_, index) => parseTime(alert.textFieldValue(index)))
  if (values.some(value => !value)) {
    await showMessage("Invalid time", "Enter each time as HH:MM.")
    return null
  }

  return values
}

async function refreshWeatherSettings() {
  let open = true

  while (open) {
    const alert = new Alert()
    alert.title = "Refresh and Weather"
    alert.addAction(`${settings.temperatureUnit === "celsius" ? "✓" : "○"} Celsius`)
    alert.addAction(`${settings.temperatureUnit === "fahrenheit" ? "✓" : "○"} Fahrenheit`)
    alert.addAction(`Requested widget refresh: ${settings.refreshMinutes} min`)
    alert.addAction("Refresh location and weather now")
    alert.addAction("Check permissions and travel")
    alert.addAction("Run Health Sync")
    alert.addAction("Check Health file")
    alert.addAction("Clear weather cache")
    alert.addCancelAction("Back")

    const choice = await alert.presentSheet()

    if (choice === 0) {
      settings.temperatureUnit = "celsius"
      clearWeatherCache()
      saveSettings()
    } else if (choice === 1) {
      settings.temperatureUnit = "fahrenheit"
      clearWeatherCache()
      saveSettings()
    } else if (choice === 2) {
      settings.refreshMinutes = await chooseRefreshMinutes(settings.refreshMinutes)
      saveSettings()
    } else if (choice === 3) {
      clearWeatherCache()
      const weather = await getWeather()
      await showMessage(
        weather ? "Weather updated" : "Weather unavailable",
        weather ? `${Math.round(weather.temperature)}° · ${weather.condition}` : "Check location and network permissions."
      )
    } else if (choice === 4) {
      await checkPermissionsAndTravel()
    } else if (choice === 5) {
      Safari.open(APP_URLS.healthSync)
    } else if (choice === 6) {
      await checkHealthSync()
    } else if (choice === 7) {
      clearWeatherCache()
      await showMessage("Weather cache cleared", "Fresh weather will be requested next time.")
    } else {
      open = false
    }
  }
}

async function chooseRefreshMinutes(current) {
  const values = [1, 5, 10, 15, 30]
  const alert = new Alert()
  alert.title = "Requested Refresh"
  alert.message = "iOS decides the actual widget refresh time."
  for (const value of values) {
    alert.addAction(`${value === current ? "✓ " : ""}${value} minute${value === 1 ? "" : "s"}`)
  }
  alert.addCancelAction("Cancel")
  const choice = await alert.presentSheet()
  return choice === -1 ? current : values[choice]
}

async function checkPermissionsAndTravel() {
  const lines = []

  const currentLocation = await getCurrentLocationForMaps()
  lines.push(currentLocation
    ? `Location: OK (${currentLocation.latitude.toFixed(3)}, ${currentLocation.longitude.toFixed(3)})`
    : "Location: unavailable")

  lines.push(settings.homeLocation ? `Home: ${settings.homeLocation}` : "Home: not set")
  lines.push(settings.workLocation ? `Work: ${settings.workLocation}` : "Work: not set")

  const testDestinationText = normaliseEventLocation(settings.workLocation) || normaliseEventLocation(settings.homeLocation)
  if (!testDestinationText) {
    lines.push("Travel test: add Home or Work location first")
  } else {
    lines.push(`Travel test: ${testDestinationText}`)
    const destination = await geocodeEventLocation(testDestinationText)
    lines.push(destination
      ? `Geocode: OK (${destination.source})`
      : "Geocode: failed - try a full address or postcode")

    if (currentLocation && destination) {
      const route = await getRouteEstimate(currentLocation, destination, settings.preferredTransport)
      lines.push(route
        ? `Route: ${formatTravelMinutes(route.minutes)} ${transportNoun(settings.preferredTransport)} · ${formatDistanceMiles(route.miles)}`
        : "Route: unavailable")
    }
  }

  const weather = await getWeather()
  lines.push(weather ? `Weather: OK (${Math.round(weather.temperature)}°)` : "Weather: unavailable")

  try {
    const workCalendars = await getEventCalendars("work")
    const workEvents = settings.showEvents ? await getWorkEvents(settings.eventCount) : []
    lines.push(`Work calendars: ${workCalendars.length || "All"}`)
    lines.push(`Work events visible: ${workEvents.length}`)
  } catch (error) {
    lines.push(`Calendar: unavailable (${error})`)
  }

  const alarm = await getNextAlarm()
  lines.push(alarm ? `Alarm file: ${formatAlarmText(alarm)}` : "Alarm file: not found")

  await showMessage("Pulse Check", lines.join("\n"))
}

async function checkHealthSync() {
  const paths = [HEALTH_PATH, ...HEALTH_FALLBACK_PATHS]
  const lines = []
  let foundPath = ""
  let parsed = null

  for (const path of paths) {
    const exists = icloud.fileExists(path)
    lines.push(`${icloud.fileName(path)}: ${exists ? "found" : "missing"}`)
    if (!exists || parsed) continue

    if (!icloud.isFileDownloaded(path)) await icloud.downloadFileFromiCloud(path)
    foundPath = path
    parsed = parseLooseJSON(icloud.readString(path), null)
  }

  if (!parsed) {
    lines.push("")
    lines.push("No readable Health file found.")
    lines.push("Expected: iCloud Drive > Scriptable > pulse-health.json")
  } else {
    const health = await getHealthSummary()
    lines.push("")
    lines.push(`Using: ${icloud.fileName(foundPath)}`)
    lines.push(health
      ? `Parsed: ${formatNumber(health.steps)} steps · ${Math.round(health.move)} kcal · ${Math.round(health.exercise)} min`
      : "Parsed: file exists but date/values were not accepted")
  }

  await showMessage("Health Sync Check", lines.join("\n"))
}

async function resetSettings() {
  const alert = new Alert()
  alert.title = "Reset Settings?"
  alert.message = "This restores the default configuration."
  alert.addDestructiveAction("Reset")
  alert.addCancelAction("Cancel")
  if (await alert.presentAlert() === 0) {
    settings = {...DEFAULTS}
    settings.setupComplete = false
    saveSettings()
    clearWeatherCache()
  }
}

// MARK: - Widget

async function createWidget(previewMode = null) {
  const widget = new ListWidget()

  const now = new Date()
  const mode = previewMode || getDashboardMode(now)
  const weather = settings.showWeather && mode !== "night" ? await getWeather() : null
  applyWidgetBackground(widget, mode, weather)
  widget.setPadding(14, 14, 12, 14)
  const commute = settings.showCommute && !previewMode && mode !== "night" ? await getBestCommute(now, mode) : null
  const health = settings.showHealth ? await getHealthSummary() : null

  if (mode === "morning") await buildMorning(widget, weather, health, commute)
  else if (mode === "work") await buildWork(widget, weather, health, commute)
  else if (mode === "dayOff") await buildDayOff(widget, weather, health, commute)
  else if (mode === "evening") await buildEvening(widget, weather, health, commute)
  else await buildNight(widget, weather, health)

  if (mode !== "night") {
    widget.addSpacer()
    addFooter(widget)
  }

  widget.refreshAfterDate = new Date(Date.now() + settings.refreshMinutes * 60 * 1000)
  return widget
}

async function buildMorning(widget, weather, health, commute = null) {
  const profile = isWeekday(new Date()) ? "work" : "personal"
  const events = settings.showEvents ? await getMorningEvents(3) : []
  const reminders = settings.showReminders ? await getReminders(profile, 3) : []
  const defaultTravelLocation = profile === "work" ? settings.workLocation : settings.homeLocation

  await buildDayStyleLayout(widget, {
    mode: "morning",
    weather,
    health,
    commute,
    events,
    defaultLocation: defaultTravelLocation,
    emptyText: "Nothing scheduled yet",
    summaryText: dayAheadSummary(events, reminders, weather),
    supportText: settings.showReminders
      ? (reminders.length ? `${reminders.length} reminder${reminders.length === 1 ? "" : "s"} due by tomorrow` : "No reminders due by tomorrow")
      : ""
  })
}

async function buildWork(widget, weather, health, commute = null) {
  const events = settings.showEvents ? await getWorkEvents(settings.eventCount) : []
  const workReminders = settings.showReminders ? await getReminders("work", 2) : []
  const personalReminders = settings.showReminders ? await getReminders("personal", 1, "today") : []

  await buildDayStyleLayout(widget, {
    mode: "work",
    weather,
    health,
    commute,
    events,
    defaultLocation: settings.workLocation,
    emptyText: "No more work events",
    summaryText: workDaySummary(events, workReminders, personalReminders),
    supportText: settings.showReminders ? workSupportLine(workReminders, personalReminders) : ""
  })
}

async function buildDayOff(widget, weather, health, commute = null) {
  const events = settings.showEvents ? await getEventsForDay(new Date(), "personal", 2) : []
  const reminders = settings.showReminders ? await getReminders("personal", 2) : []
  const workReminders = settings.showReminders ? await getReminders("work", 1, "today") : []

  await buildDayStyleLayout(widget, {
    mode: "dayOff",
    weather,
    health,
    commute,
    events,
    defaultLocation: settings.homeLocation,
    emptyText: "Nothing planned",
    summaryText: dayOffSummary(reminders, weather),
    supportText: settings.showReminders ? personalSupportLine(reminders, workReminders) : ""
  })
}

async function buildEvening(widget, weather, health, commute = null) {
  const tomorrow = startOfTomorrow()
  const profile = isWeekday(tomorrow) ? "work" : "personal"
  const events = settings.showEvents ? await getEventsForDay(tomorrow, profile, 2) : []
  const reminders = settings.showReminders ? await getReminders("personal", 1) : []
  const defaultTravelLocation = profile === "work" ? settings.workLocation : settings.homeLocation

  await buildDayStyleLayout(widget, {
    mode: "evening",
    weather,
    health,
    commute,
    events,
    defaultLocation: defaultTravelLocation,
    emptyText: "Nothing first thing",
    summaryText: eveningSummary(weather, reminders),
    supportText: settings.showReminders && reminders.length ? `${reminders.length} personal reminder${reminders.length === 1 ? "" : "s"}` : ""
  })
}

async function buildDayStyleLayout(widget, {mode, weather, health, commute, events, defaultLocation, emptyText, summaryText, supportText}) {
  widget.addSpacer()
  addDayGreeting(widget, mode, weather, summaryText)
  widget.addSpacer()

  await addCenteredPriority(widget, {
    mode,
    commute,
    events,
    defaultLocation,
    emptyText
  })
  widget.addSpacer()

  if (settings.showHealth) {
    addCenteredHealthGlance(widget, health)
    widget.addSpacer(4)
  }

  if (settings.showFasting) {
    addCenteredFastingGlance(widget)
    widget.addSpacer(4)
  }

  if (supportText) addCenteredGlanceMeta(widget, supportText, APP_URLS.reminders)
}

async function buildNight(widget, weather, health) {
  const tomorrow = startOfTomorrow()
  const profile = isWeekday(tomorrow) ? "work" : "personal"
  const events = settings.showEvents ? await getEventsForDay(tomorrow, profile, 1) : []
  const alarm = await getNextAlarm()
  const nextEvent = events[0]
  const defaultTravelLocation = profile === "work" ? settings.workLocation : settings.homeLocation
  const eventLocationDetail = nextEvent ? await getEventLocationDetail(nextEvent, defaultTravelLocation) : ""

  widget.addSpacer()
  addNightGreeting(widget, health)
  widget.addSpacer()
  if (settings.showHealth) {
    addCenteredIconMeta(widget, "heart.fill", health ? healthSummaryLine(health) : "Tap to Sync Health", APP_URLS.healthSync)
    widget.addSpacer()
  }

  addBatteryGlance(widget)
  widget.addSpacer()
  if (alarm) {
    addCenteredIconMeta(widget, "alarm.fill", formatAlarmText(alarm), APP_URLS.clock)
    widget.addSpacer(4)
  }
  if (nextEvent) {
    const flow = eventFlowSummary(nextEvent)
    addCenteredGlanceMeta(widget, `${flow.label}: ${eventGlanceText(nextEvent)}`, APP_URLS.calendar)
    if (eventLocationDetail) {
      widget.addSpacer(4)
      addCenteredIconMeta(widget, "car.fill", eventLocationDetail, APP_URLS.maps)
    }
  }
}

// MARK: - Commute

async function getBestCommute(date, mode) {
  const eventCommute = await getEventCommute(date, mode)
  if (eventCommute) return eventCommute
  return shouldShowCommute(date) ? await getCommute() : null
}

function shouldShowCommute(date) {
  if (!isWeekday(date)) return false

  const current = minutesOfDay(date)
  const morningStart = minutesFromMidnight(settings.commuteMorningStartHour, settings.commuteMorningStartMinute)
  const morningEnd = minutesFromMidnight(settings.commuteMorningEndHour, settings.commuteMorningEndMinute)
  const eveningStart = minutesFromMidnight(settings.commuteEveningStartHour, settings.commuteEveningStartMinute)
  const eveningEnd = minutesFromMidnight(settings.commuteEveningEndHour, settings.commuteEveningEndMinute)

  return (current >= morningStart && current < morningEnd) ||
         (current >= eveningStart && current < eveningEnd)
}

async function getEventCommute(date, mode) {
  try {
    const event = await getNextLocatedEvent(date, mode)
    if (!event) return null

    const currentLocation = await getCurrentLocationForMaps()
    const destination = currentLocation ? await geocodeEventLocation(event.location) : null
    const route = currentLocation && destination
      ? await getRouteEstimate(currentLocation, destination, settings.preferredTransport)
      : null
    const distanceMiles = route?.miles || (
      currentLocation && destination ? straightLineDistanceMiles(currentLocation, destination) : 0
    )
    const mapsURL = mapsURLForDestination(event.location, currentLocation)
    const travelMinutes = route?.minutes || null
    if (Number.isFinite(Number(travelMinutes)) && Number(travelMinutes) < Number(settings.commuteMinTravelMinutes || 0)) {
      return {
        label: event.title || "Event",
        traffic: eventContextText(event),
        mapsURL,
        updatedAt: Date.now(),
        type: "nearbyEvent",
        event
      }
    }

    return {
      destination: event.location,
      label: event.title || "Event",
      travelMinutes,
      arrivalTime: "",
      distanceMiles,
      traffic: eventContextText(event),
      mapsURL,
      updatedAt: Date.now(),
      type: "event",
      event
    }
  } catch (error) {
    console.log(`Event commute error: ${error}`)
    return null
  }
}

async function getNextLocatedEvent(date, mode) {
  const calendars = await getCommuteCalendars(mode)
  const end = new Date(date.getTime() + settings.eventCommuteLookaheadMinutes * 60 * 1000)
  const events = await CalendarEvent.between(date, end, calendars.length ? calendars : null)

  return events
    .filter(event => !event.isAllDay)
    .filter(event => event.endDate >= date)
    .filter(event => String(event.location || "").trim().length > 0)
    .sort((a, b) => a.startDate - b.startDate)[0] || null
}

async function getCommuteCalendars(mode) {
  const calendars = await Calendar.forEvents()
  const ids = [
    ...settings.workCalendarIdentifiers,
    ...settings.personalCalendarIdentifiers
  ]

  if (ids.length) return calendars.filter(calendar => ids.includes(calendar.identifier))
  if (mode === "work" || mode === "morning") return await getEventCalendars("work")
  return await getEventCalendars("personal")
}

async function getCommute() {
  try {
    const data = await readICloudJSON(COMMUTE_PATH)
    if (!data || !Number.isFinite(Number(data.travelMinutes))) return null

    const updatedAt = Number(data.updatedAt || 0)
    const maxAge = settings.commuteMaxAgeMinutes * 60 * 1000
    if (updatedAt && Date.now() - updatedAt > maxAge) return null

    return {
      destination: data.destination || "destination",
      label: data.label || titleCase(data.destination || "destination"),
      travelMinutes: Number(data.travelMinutes),
      arrivalTime: data.arrivalTime || "",
      distanceMiles: Number(data.distanceMiles || 0),
      traffic: data.traffic || "",
      mapsURL: data.mapsURL || "",
      updatedAt
    }
  } catch (error) {
    console.log(`Commute error: ${error}`)
    return null
  }
}

function commuteDetailText(commute) {
  if (Number.isFinite(Number(commute.travelMinutes))) {
    return `${Math.round(commute.travelMinutes)} min ${transportNoun(settings.preferredTransport)}` +
      (commute.arrivalTime ? ` · arrive ${commute.arrivalTime}` : "")
  }

  return commute.type === "event" ? "Open route in Maps" : "Open Maps"
}

async function getCurrentLocationForMaps() {
  try {
    Location.setAccuracyToThreeKilometers()
    return await Location.current()
  } catch (error) {
    console.log(`Current location for Maps error: ${error}`)
    return null
  }
}

function mapsURLForDestination(destination, currentLocation = null) {
  const parts = [
    "maps://?",
    currentLocation
      ? `saddr=${encodeURIComponent(`${currentLocation.latitude},${currentLocation.longitude}`)}&`
      : "",
    `daddr=${encodeURIComponent(destination)}`,
    `&dirflg=${mapsDirectionFlag(settings.preferredTransport)}`
  ]
  return parts.join("")
}

// MARK: - Weather

async function getWeather() {
  const cached = loadWeatherCache()
  if (cached && isWeatherCacheFresh(cached)) return cached

  try {
    Location.setAccuracyToThreeKilometers()
    const location = await Location.current()
    const unit = settings.temperatureUnit === "fahrenheit" ? "fahrenheit" : "celsius"

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${encodeURIComponent(location.latitude)}` +
      `&longitude=${encodeURIComponent(location.longitude)}` +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&forecast_days=2" +
      `&temperature_unit=${unit}` +
      "&wind_speed_unit=mph" +
      "&timezone=auto"

    const request = new Request(url)
    request.timeoutInterval = 12
    const response = await request.loadJSON()

    const result = {
      temperature: response.current.temperature_2m,
      apparentTemperature: response.current.apparent_temperature,
      wind: response.current.wind_speed_10m,
      weatherCode: response.current.weather_code,
      condition: weatherCodeToText(response.current.weather_code),
      today: dailyWeather(response, 0),
      tomorrow: dailyWeather(response, 1),
      updatedAt: Date.now()
    }

    saveWeatherCache(result)
    return result
  } catch (error) {
    console.log(`Weather error: ${error}`)
    return cached || null
  }
}

function dailyWeather(response, index) {
  if (!response.daily || !response.daily.weather_code || response.daily.weather_code.length <= index) return null
  return {
    weatherCode: response.daily.weather_code[index],
    condition: weatherCodeToText(response.daily.weather_code[index]),
    maximum: response.daily.temperature_2m_max[index],
    minimum: response.daily.temperature_2m_min[index],
    rainChance: response.daily.precipitation_probability_max[index]
  }
}

function addWeatherDetail(widget, weather, title) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.url = APP_URLS.weather

  const symbol = row.addImage(weatherSymbolImage(weather.weatherCode, new Date()))
  symbol.imageSize = new Size(18, 18)
  symbol.tintColor = weatherSymbolColor(weather.weatherCode, new Date())

  row.addSpacer(7)

  const text = row.addStack()
  text.layoutVertically()

  const heading = text.addText(`${titleCaseLabel(title)} · ${weather.condition}`)
  heading.font = Font.mediumSystemFont(10)
  heading.textColor = new Color(settings.secondaryText)

  text.addSpacer(1)

  const details = []
  if (weather.maximum !== null && weather.minimum !== null) {
    details.push(`H ${Math.round(weather.maximum)}°  L ${Math.round(weather.minimum)}°`)
  }
  if (weather.rainChance !== null && weather.rainChance !== undefined) {
    details.push(`${Math.round(weather.rainChance)}% rain`)
  }

  const detail = text.addText(details.join(" · "))
  detail.font = Font.semiboldSystemFont(11)
  detail.textColor = new Color(settings.primaryText)
  detail.lineLimit = 1
}

function weatherSymbolImage(code, date) {
  const symbol = SFSymbol.named(weatherSymbolName(code, date)) || SFSymbol.named("cloud.fill")
  return symbol.image
}

function weatherSymbolName(code, date) {
  const night = date.getHours() < 6 || date.getHours() >= 20

  if (code === 0) return night ? "moon.stars.fill" : "sun.max.fill"
  if (code === 1) return night ? "cloud.moon.fill" : "cloud.sun.fill"
  if (code === 2) return night ? "cloud.moon.fill" : "cloud.sun.fill"
  if (code === 3) return "cloud.fill"
  if (code === 45 || code === 48) return "cloud.fog.fill"
  if ([51, 53, 55, 56, 57].includes(code)) return "cloud.drizzle.fill"
  if ([61, 63, 66, 67].includes(code)) return "cloud.rain.fill"
  if ([65, 82].includes(code)) return "cloud.heavyrain.fill"
  if ([80, 81].includes(code)) return night ? "cloud.moon.rain.fill" : "cloud.sun.rain.fill"
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "cloud.snow.fill"
  if ([95, 96, 99].includes(code)) return "cloud.bolt.rain.fill"
  return "cloud.fill"
}

function weatherSymbolColor(code, date) {
  const night = date.getHours() < 6 || date.getHours() >= 20

  if (code === 0) return new Color(night ? "#D5DBFF" : "#FFD60A")
  if (code === 1 || code === 2) return new Color(night ? "#D5DBFF" : "#FFD60A")
  if ([51, 53, 55, 56, 57].includes(code)) return new Color("#8FD8FF")
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return new Color("#64D2FF")
  if ([71, 73, 75, 77, 85, 86].includes(code)) return new Color("#E5F6FF")
  if ([95, 96, 99].includes(code)) return new Color("#BF5AF2")
  if ([45, 48].includes(code)) return new Color("#AEAEB2")
  return new Color("#D1D1D6")
}

function weatherCodeToText(code) {
  const map = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Freezing fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers",
    81: "Showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Storm and hail",
    99: "Heavy storm"
  }
  return map[code] || "Current conditions"
}

function loadWeatherCache() {
  return readLocalJSON(WEATHER_CACHE_PATH)
}

function saveWeatherCache(data) {
  try { fm.writeString(WEATHER_CACHE_PATH, JSON.stringify(data, null, 2)) }
  catch (error) { console.log(`Weather cache error: ${error}`) }
}

function clearWeatherCache() {
  try {
    if (fm.fileExists(WEATHER_CACHE_PATH)) fm.remove(WEATHER_CACHE_PATH)
  } catch (error) {
    console.log(`Clear cache error: ${error}`)
  }
}

function isWeatherCacheFresh(data) {
  return data?.updatedAt && Date.now() - data.updatedAt < settings.weatherCacheMinutes * 60 * 1000
}

// MARK: - Activity

async function getNextAlarm() {
  try {
    const data = await readFirstICloudJSON([ALARM_PATH, ...ALARM_FALLBACK_PATHS])
    if (!data) return null

    const date = parseAlarmDate(data)
    if (date && date.getTime() < Date.now() - 60000) return null

    const label = String(data.label || data.name || data.title || "Alarm").trim()
    return {
      label: label || "Alarm",
      date,
      time: String(data.time || data.alarmTime || "").trim()
    }
  } catch (error) {
    console.log(`Alarm error: ${error}`)
    return null
  }
}

function parseAlarmDate(data) {
  const timestamp = data.timestamp || data.updatedAt || data.dateTime || data.datetime
  const parsedTimestamp = parseHealthTimestamp(timestamp)
  if (parsedTimestamp) return new Date(parsedTimestamp)

  const text = String(data.date || data.nextAlarm || data.alarm || "").trim()
  if (text) {
    const parsed = new Date(text)
    if (Number.isFinite(parsed.getTime())) return parsed
  }

  const time = String(data.time || data.alarmTime || "").trim()
  if (!time) return null

  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null

  const next = new Date()
  next.setHours(Number(match[1]), Number(match[2]), 0, 0)
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1)
  return next
}

function formatAlarmText(alarm) {
  const prefix = alarm.label && alarm.label !== "Alarm" ? alarm.label : "Alarm"
  if (alarm.date) {
    const when = isSameDay(alarm.date, startOfTomorrow())
      ? `tomorrow at ${formatShortTime(alarm.date)}`
      : formatShortTime(alarm.date)
    return `${prefix} · ${when}`
  }

  return alarm.time ? `${prefix} · ${alarm.time}` : prefix
}

async function getHealthSummary() {
  try {
    const data = await readFirstICloudJSON([HEALTH_PATH, ...HEALTH_FALLBACK_PATHS])
    if (!data) return null

    // Shortcuts may save dates as ISO strings, locale-formatted text, or omit
    // them entirely. Only reject the file when the date is clear and stale.
    if (data.date && !isTodayishDate(data.date)) return null

    return {
      steps: Math.round(firstNumber(data, ["steps", "Steps", "stepCount", "Step Count"])),
      move: Math.round(firstNumber(data, ["move", "Move", "activeEnergy", "Active Energy", "activeEnergyBurned", "Active Energy Burned", "calories", "Calories", "kcal"])),
      moveGoal: positiveNumberOrFallback(firstNumber(data, ["moveGoal", "Move Goal", "activeEnergyGoal", "Active Energy Goal"], NaN), 600),
      exercise: Math.round(firstNumber(data, ["exercise", "Exercise", "exerciseMinutes", "Exercise Minutes", "appleExerciseTime", "Apple Exercise Time", "minutes", "Minutes"])),
      exerciseGoal: positiveNumberOrFallback(firstNumber(data, ["exerciseGoal", "Exercise Goal", "exerciseMinutesGoal", "Exercise Minutes Goal"], NaN), 30),
      updatedAt: parseHealthTimestamp(data.updatedAt || data.updated || data.Updated || data.timestamp)
    }
  } catch (error) {
    console.log(`Health error: ${error}`)
    return null
  }
}

function addHealthSection(widget, health) {
  const heading = widget.addStack()
  heading.layoutHorizontally()
  addSectionLabel(heading, "Today's Activity")
  heading.addSpacer()

  const synced = heading.addText(health.updatedAt ? `Synced ${formatShortTime(new Date(health.updatedAt))}` : "Synced")
  synced.font = Font.regularSystemFont(8)
  synced.textColor = new Color(settings.secondaryText)

  widget.addSpacer(3)

  const stepRow = widget.addStack()
  stepRow.layoutHorizontally()
  stepRow.bottomAlignContent()

  const steps = stepRow.addText(formatNumber(health.steps))
  steps.font = Font.semiboldSystemFont(19)
  steps.textColor = new Color(settings.primaryText)

  stepRow.addSpacer(5)

  const label = stepRow.addText("steps")
  label.font = Font.mediumSystemFont(9)
  label.textColor = new Color(settings.secondaryText)

  widget.addSpacer(3)
  addActivityProgressRow(widget, "Move", health.move, health.moveGoal, "kcal")
  widget.addSpacer(2)
  addActivityProgressRow(widget, "Exercise", health.exercise, health.exerciseGoal, "min")
}

function addHealthPlaceholder(widget) {
  addSectionLabel(widget, "Today's Activity")
  widget.addSpacer(3)
  addSubtleText(widget, "Sync Health")
}

function addActivityProgressRow(widget, title, value, goal, unit) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const label = row.addText(title)
  label.font = Font.mediumSystemFont(9)
  label.textColor = new Color(settings.secondaryText)

  row.addSpacer()

  const image = row.addImage(createProgressBar(value / goal, 74, 4))
  image.imageSize = new Size(74, 4)

  row.addSpacer(6)

  const detail = row.addText(`${Math.round(value)} / ${Math.round(goal)} ${unit}`)
  detail.font = Font.regularSystemFont(8)
  detail.textColor = new Color(settings.primaryText)
}

// MARK: - Fasting

function addFastingSection(widget) {
  const phase = getCurrentPhase(new Date())
  addSectionLabel(widget, phase.isFasting ? "FAST" : "EATING WINDOW")
  widget.addSpacer(3)

  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const left = row.addStack()
  left.layoutVertically()

  // WidgetDate timer style is rendered and updated by iOS.
  // This allows the countdown to keep ticking between full widget refreshes.
  const timer = left.addDate(phase.end)
  timer.applyTimerStyle()
  timer.font = Font.boldSystemFont(18)
  timer.textColor = new Color(settings.primaryText)
  timer.lineLimit = 1
  timer.minimumScaleFactor = 0.65

  left.addSpacer(1)

  const status = left.addText(
    phase.isFasting
      ? `Remaining · ends ${formatShortTime(phase.end)}`
      : `Until fast begins · ${formatShortTime(phase.end)}`
  )
  status.font = Font.regularSystemFont(8)
  status.textColor = new Color(settings.secondaryText)
  status.lineLimit = 1
  status.minimumScaleFactor = 0.75

  row.addSpacer()

  const progress = (Date.now() - phase.start.getTime()) / (phase.end.getTime() - phase.start.getTime())
  const right = row.addStack()
  right.layoutVertically()

  const percent = right.addText(`${Math.round(clampProgress(progress) * 100)}%`)
  percent.font = Font.mediumSystemFont(8)
  percent.textColor = new Color(settings.secondaryText)
  percent.rightAlignText()

  right.addSpacer(2)

  const bar = right.addImage(createProgressBar(progress, 88, 5))
  bar.imageSize = new Size(88, 5)
}

function getCurrentPhase(now) {
  const fastStart = minutesFromMidnight(settings.fastingStartHour, settings.fastingStartMinute)
  const fastEnd = minutesFromMidnight(settings.fastingEndHour, settings.fastingEndMinute)
  const current = minutesOfDay(now)
  const crossesMidnight = fastStart > fastEnd

  const isFasting = crossesMidnight
    ? current >= fastStart || current < fastEnd
    : current >= fastStart && current < fastEnd

  let start
  let end

  if (isFasting) {
    if (crossesMidnight && current < fastEnd) {
      start = dateAtTime(addDays(now, -1), settings.fastingStartHour, settings.fastingStartMinute)
      end = dateAtTime(now, settings.fastingEndHour, settings.fastingEndMinute)
    } else {
      start = dateAtTime(now, settings.fastingStartHour, settings.fastingStartMinute)
      end = crossesMidnight
        ? dateAtTime(addDays(now, 1), settings.fastingEndHour, settings.fastingEndMinute)
        : dateAtTime(now, settings.fastingEndHour, settings.fastingEndMinute)
    }
  } else {
    start = dateAtTime(now, settings.fastingEndHour, settings.fastingEndMinute)
    end = dateAtTime(now, settings.fastingStartHour, settings.fastingStartMinute)
    if (end <= start) end = addDays(end, 1)
    if (now < start) start = addDays(start, -1)
  }

  return {isFasting, start, end}
}

// MARK: - Calendar and Reminders

async function getEventsForDay(date, profile, count) {
  try {
    const calendars = await getEventCalendars(profile)
    const events = await CalendarEvent.between(startOfDay(date), endOfDay(date), calendars.length ? calendars : null)
    const now = new Date()

    return events
      .filter(event => settings.showAllDayEvents || !event.isAllDay)
      .filter(event => !isSameDay(date, now) || event.endDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, count)
  } catch (error) {
    console.log(`Event error: ${error}`)
    return []
  }
}

async function getMorningEvents(count) {
  try {
    const calendars = await getMorningEventCalendars()
    const now = new Date()
    const today = await CalendarEvent.between(startOfDay(now), endOfDay(now), calendars.length ? calendars : null)
    const upcomingToday = today
      .filter(event => settings.showAllDayEvents || !event.isAllDay)
      .filter(event => event.endDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, count)

    if (upcomingToday.length) return upcomingToday

    const lookaheadEnd = endOfDay(addDays(now, 365))

    // Morning scans both Work and Personal calendars, then falls forward to the
    // next relevant event if today itself is empty.
    return (await CalendarEvent.between(now, lookaheadEnd, calendars.length ? calendars : null))
      .filter(event => settings.showAllDayEvents || !event.isAllDay)
      .filter(event => event.endDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, count)
  } catch (error) {
    console.log(`Morning event error: ${error}`)
    return []
  }
}

async function getWorkEvents(count) {
  try {
    const calendars = await getCommuteCalendars("work")
    const now = new Date()
    const today = await CalendarEvent.between(startOfDay(now), endOfDay(now), calendars.length ? calendars : null)
    const upcomingToday = today
      .filter(event => settings.showAllDayEvents || !event.isAllDay)
      .filter(event => event.endDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, count)

    if (upcomingToday.length) return upcomingToday

    const lookaheadEnd = endOfDay(addDays(now, 30))

    // Work mode uses the same calendar source as the top event strip so both
    // sections agree about the current work calendar.
    return (await CalendarEvent.between(now, lookaheadEnd, calendars.length ? calendars : null))
      .filter(event => settings.showAllDayEvents || !event.isAllDay)
      .filter(event => event.endDate >= now)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, count)
  } catch (error) {
    console.log(`Work event error: ${error}`)
    return []
  }
}

async function getMorningEventCalendars() {
  const calendars = await Calendar.forEvents()
  const ids = [
    ...settings.workCalendarIdentifiers,
    ...settings.personalCalendarIdentifiers
  ]

  const uniqueIds = [...new Set(ids.filter(Boolean))]
  return uniqueIds.length
    ? calendars.filter(calendar => uniqueIds.includes(calendar.identifier))
    : calendars
}

async function getEventLocationDetail(event, defaultLocation = "") {
  const location =
    normaliseEventLocation(event.location) ||
    fallbackEventLocation(event, defaultLocation)
  if (!location) return ""

  try {
    const currentLocation = await getCurrentLocationForMaps()
    if (!currentLocation) return location

    const destination = await geocodeEventLocation(location)
    if (!destination) return location

    const route = await getRouteEstimate(currentLocation, destination, settings.preferredTransport)
    if (route) return `${formatTravelMinutes(route.minutes)} ${transportNoun(settings.preferredTransport)} · ${formatDistanceMiles(route.miles)} · ${location}`

    const directMiles = straightLineDistanceMiles(currentLocation, destination)
    return Number.isFinite(directMiles)
      ? `About ${formatDistanceMiles(directMiles)} away · ${location}`
      : location
  } catch (error) {
    console.log(`Event location detail error: ${error}`)
    return location
  }
}

function fallbackEventLocation(event, defaultLocation = "") {
  if (isWorkCalendarEvent(event)) return normaliseEventLocation(settings.workLocation)
  return normaliseEventLocation(defaultLocation) || normaliseEventLocation(settings.homeLocation)
}

function isWorkCalendarEvent(event) {
  const identifier = String(event?.calendar?.identifier || "")
  if (identifier && settings.workCalendarIdentifiers.includes(identifier)) return true

  const title = String(event?.calendar?.title || event?.calendar?.name || "").toLowerCase()
  return Boolean(title && title.includes("work"))
}

function normaliseEventLocation(location) {
  return String(location || "")
    .replace(/\s+/g, " ")
    .trim()
}

async function geocodeEventLocation(location) {
  const query = geocodeQuery(location)
  const systemResult = await geocodeWithSystem(query)
  if (systemResult) return systemResult
  return await geocodeWithNominatim(query)
}

function geocodeQuery(location) {
  const text = normaliseEventLocation(location)
  if (!text) return ""
  return /\b(uk|united kingdom|england|scotland|wales|northern ireland)\b/i.test(text)
    ? text
    : `${text}, UK`
}

async function geocodeWithSystem(location) {
  try {
    const results = await Location.geocodeAddress(location)
    const first = results && results[0]
    if (!first) return null

    const latitude = Number(first.latitude)
    const longitude = Number(first.longitude)
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? {latitude, longitude, source: "Apple"}
      : null
  } catch (error) {
    console.log(`Event geocode error: ${error}`)
    return null
  }
}

async function geocodeWithNominatim(location) {
  try {
    const request = new Request(
      "https://nominatim.openstreetmap.org/search" +
      `?format=json&limit=1&q=${encodeURIComponent(location)}`
    )
    request.headers = {
      "User-Agent": "Pulse Scriptable Widget"
    }

    const results = await request.loadJSON()
    const first = results && results[0]
    if (!first) return null

    const latitude = Number(first.lat)
    const longitude = Number(first.lon)
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? {latitude, longitude, source: "OSM"}
      : null
  } catch (error) {
    console.log(`Nominatim geocode error: ${error}`)
    return null
  }
}

async function getDrivingRouteEstimate(origin, destination) {
  return await getRouteEstimate(origin, destination, "driving")
}

async function getRouteEstimate(origin, destination, transport = settings.preferredTransport) {
  try {
    const profile = routeProfile(transport)
    const url =
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${encodeURIComponent(origin.longitude)},${encodeURIComponent(origin.latitude)};` +
      `${encodeURIComponent(destination.longitude)},${encodeURIComponent(destination.latitude)}` +
      "?overview=false"
    const data = await new Request(url).loadJSON()
    const route = data?.routes?.[0]
    const metres = Number(route?.distance)
    const seconds = Number(route?.duration)
    if (!Number.isFinite(metres)) return null

    return {
      miles: metres / 1609.344,
      minutes: Number.isFinite(seconds) ? seconds / 60 : null
    }
  } catch (error) {
    console.log(`Driving route error: ${error}`)
    return null
  }
}

function routeProfile(transport) {
  if (transport === "walking") return "foot"
  if (transport === "cycling") return "bike"
  return "driving"
}

function mapsDirectionFlag(transport) {
  if (transport === "walking") return "w"
  if (transport === "transit") return "r"
  return "d"
}

function transportLabel(transport) {
  if (transport === "walking") return "Walking"
  if (transport === "cycling") return "Cycling"
  return "Driving"
}

function transportNoun(transport) {
  if (transport === "walking") return "walk"
  if (transport === "cycling") return "cycle"
  return "drive"
}

function transportSymbol(transport) {
  if (transport === "walking") return "figure.walk"
  if (transport === "cycling") return "bicycle"
  return "car.fill"
}

function straightLineDistanceMiles(a, b) {
  const earthRadiusMiles = 3958.8
  const lat1 = degreesToRadians(Number(a.latitude))
  const lat2 = degreesToRadians(Number(b.latitude))
  const deltaLat = degreesToRadians(Number(b.latitude) - Number(a.latitude))
  const deltaLon = degreesToRadians(Number(b.longitude) - Number(a.longitude))

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function degreesToRadians(value) {
  return value * Math.PI / 180
}

function formatDistanceMiles(miles) {
  if (!Number.isFinite(miles)) return ""
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

function formatTravelMinutes(minutes) {
  if (!Number.isFinite(minutes)) return "drive"
  const rounded = Math.max(1, Math.round(minutes))
  return `${rounded} min`
}

async function getEventCalendars(profile) {
  const calendars = await Calendar.forEvents()
  const ids = profile === "work" ? settings.workCalendarIdentifiers : settings.personalCalendarIdentifiers
  return !ids?.length ? calendars : calendars.filter(calendar => ids.includes(calendar.identifier))
}

function addEventsSection(widget, events, title) {
  const header = widget.addStack()
  header.layoutHorizontally()
  header.url = APP_URLS.calendar
  addSectionLabel(header, title)
  header.addSpacer()

  const count = header.addText(events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : "Clear")
  count.font = Font.regularSystemFont(9)
  count.textColor = new Color(settings.secondaryText)

  widget.addSpacer(3)

  if (!events.length) {
    addSubtleText(widget, "Nothing scheduled")
    return
  }

  events.forEach((event, index) => {
    const row = widget.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    row.url = APP_URLS.calendar

    const time = row.addText(event.isAllDay ? "All day" : formatShortTime(event.startDate))
    time.font = Font.mediumSystemFont(9)
    time.textColor = new Color(settings.secondaryText)

    row.addSpacer(8)

    const titleText = row.addText(event.title || "Untitled event")
    titleText.font = Font.regularSystemFont(12)
    titleText.textColor = new Color(settings.primaryText)
    titleText.lineLimit = 1
    titleText.minimumScaleFactor = 0.7

    if (index < events.length - 1) widget.addSpacer(2)
  })
}

async function getReminders(profile, count, dueWindow = "tomorrow") {
  try {
    const calendars = await getReminderCalendars(profile)
    const reminders = await Reminder.allIncomplete(calendars.length ? calendars : null)

    return reminders
      .filter(reminder => reminderIsInWindow(reminder, dueWindow))
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
        if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return (a.title || "").localeCompare(b.title || "")
      })
      .slice(0, count)
  } catch (error) {
    console.log(`Reminder error: ${error}`)
    return []
  }
}

function reminderIsInWindow(reminder, dueWindow = "tomorrow") {
  if (!reminder.dueDate) return false
  if (reminder.isOverdue) return true

  // Active profile reminders can look to tomorrow; cross-profile nudges stay on today.
  const limit = dueWindow === "today" ? endOfDay(new Date()) : endOfDay(startOfTomorrow())
  return reminder.dueDate <= limit
}

async function getReminderCalendars(profile) {
  const calendars = await Calendar.forReminders()
  const ids = profile === "work" ? settings.workReminderIdentifiers : settings.personalReminderIdentifiers
  return !ids?.length ? calendars : calendars.filter(calendar => ids.includes(calendar.identifier))
}

function addRemindersSection(widget, reminders, title) {
  const header = widget.addStack()
  header.layoutHorizontally()
  header.url = APP_URLS.reminders
  addSectionLabel(header, title)
  header.addSpacer()

  const count = header.addText(reminders.length ? `${reminders.length} open` : "Clear")
  count.font = Font.regularSystemFont(9)
  count.textColor = new Color(settings.secondaryText)

  widget.addSpacer(3)

  if (!reminders.length) {
    addSubtleText(widget, "No outstanding reminders")
    return
  }

  reminders.forEach((reminder, index) => {
    const row = widget.addStack()
    row.layoutHorizontally()
    row.centerAlignContent()
    row.url = APP_URLS.reminders

    const circle = row.addImage(SFSymbol.named("circle").image)
    circle.imageSize = new Size(8, 8)
    circle.tintColor = new Color(reminder.isOverdue ? settings.overdue : settings.secondaryText)

    row.addSpacer(7)

    const titleText = row.addText(reminder.title || "Untitled reminder")
    titleText.font = Font.regularSystemFont(12)
    titleText.textColor = new Color(settings.primaryText)
    titleText.lineLimit = 1
    titleText.minimumScaleFactor = 0.7

    row.addSpacer()

    if (reminder.dueDate) {
      const due = row.addText(formatReminderDue(reminder))
      due.font = Font.regularSystemFont(9)
      due.textColor = new Color(reminder.isOverdue ? settings.overdue : settings.secondaryText)
    }

    if (index < reminders.length - 1) widget.addSpacer(2)
  })
}

// MARK: - Mode

function getDashboardMode(date = new Date()) {
  const current = minutesOfDay(date)
  const morningStart = minutesFromMidnight(settings.morningStartHour, settings.morningStartMinute)
  const workStart = minutesFromMidnight(settings.workStartHour, settings.workStartMinute)
  const workEnd = minutesFromMidnight(settings.workEndHour, settings.workEndMinute)
  const eveningEnd = minutesFromMidnight(settings.eveningEndHour, settings.eveningEndMinute)

  if (current >= morningStart && current < workStart) return "morning"
  if (isWorkday(date) && current >= workStart && current < workEnd) return "work"
  if (!isWorkday(date) && current >= workStart && current < workEnd) return "dayOff"
  if (current >= workEnd && current < eveningEnd) return "evening"
  return "night"
}

function greetingForMode(mode) {
  if (mode === "morning") return personalGreeting("Good morning")
  if (mode === "dayOff") return personalGreeting("Good morning")
  if (mode === "evening") return personalGreeting("Good evening")
  if (mode === "night") return personalGreeting("Good night")
  return personalGreeting(new Date().getHours() < 12 ? "Good morning" : "Good afternoon")
}

function personalGreeting(greeting) {
  const name = String(settings.userName || "").trim()
  const titleGreeting = titleCaseLabel(greeting)
  return name ? `${titleGreeting}, ${name}` : titleGreeting
}

function modeLabel(mode) {
  if (mode === "morning") return "Morning Summary"
  if (mode === "work") return "Work"
  if (mode === "dayOff") return "Day Off"
  if (mode === "evening") return "Evening Summary"
  return "Night Summary"
}

function isWorkday(date) {
  return isWorkdayNumber(date.getDay())
}

function isWorkdayNumber(day) {
  const workdays = Array.isArray(settings.workdays) ? settings.workdays : DEFAULTS.workdays
  return workdays.map(Number).includes(Number(day))
}

function isWeekday(date) {
  return isWorkday(date)
}

// MARK: - Drawing and UI

function createProgressBar(progress, width, height) {
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false
  ctx.respectScreenScale = true

  const background = new Path()
  background.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2)
  ctx.addPath(background)
  ctx.setFillColor(new Color(settings.progressBackground))
  ctx.fillPath()

  const safe = clampProgress(progress)
  if (safe > 0) {
    const foreground = new Path()
    foreground.addRoundedRect(
      new Rect(0, 0, Math.max(height, width * safe), height),
      height / 2,
      height / 2
    )
    ctx.addPath(foreground)
    ctx.setFillColor(new Color(settings.accent))
    ctx.fillPath()
  }

  return ctx.getImage()
}

function addSectionLabel(parent, text) {
  const label = parent.addText(titleCaseLabel(text))
  label.font = Font.semiboldSystemFont(10)
  label.textColor = new Color(settings.secondaryText)
  return label
}

function addSubtleText(widget, text) {
  const label = widget.addText(text)
  label.font = Font.regularSystemFont(10)
  label.textColor = new Color(settings.secondaryText)
  label.lineLimit = 1
  label.minimumScaleFactor = 0.7
}

function addNativeCell(parent, url = null) {
  const cell = parent.addStack()
  cell.layoutVertically()
  cell.backgroundColor = new Color(settings.cardBackground, 0.82)
  cell.cornerRadius = 18
  cell.setPadding(6, 10, 6, 10)
  if (url) cell.url = url
  return cell
}

function addGlanceMeta(widget, text, url = null) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  if (url) row.url = url

  const label = row.addText(text)
  label.font = Font.regularSystemFont(12)
  label.textColor = new Color(settings.secondaryText)
  label.lineLimit = 1
  label.minimumScaleFactor = 0.75
}

function addCenteredGlanceMeta(widget, text, url = null) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  if (url) row.url = url

  row.addSpacer()
  const label = row.addText(text)
  label.font = Font.regularSystemFont(12)
  label.textColor = new Color(settings.secondaryText)
  label.centerAlignText()
  label.lineLimit = 2
  label.minimumScaleFactor = 0.7
  row.addSpacer()
}

function addCenteredIconMeta(widget, symbol, text, url = null) {
  addCenteredIconLabel(widget, {
    symbol,
    text,
    width: 240,
    url,
    font: Font.regularSystemFont(12),
    color: new Color(settings.secondaryText),
    lineLimit: 1,
    minimumScaleFactor: 0.75
  })
}

function addDayGreeting(widget, mode, weather, summaryText = "") {
  const column = widget.addStack()
  column.layoutVertically()
  column.centerAlignContent()

  const greetingRow = column.addStack()
  greetingRow.layoutHorizontally()
  greetingRow.centerAlignContent()
  greetingRow.addSpacer()

  const greeting = greetingRow.addText(greetingForMode(mode))
  greeting.font = Font.semiboldSystemFont(30)
  greeting.textColor = new Color(settings.primaryText)
  greeting.centerAlignText()
  greeting.lineLimit = 2
  greeting.minimumScaleFactor = 0.62
  greetingRow.addSpacer()

  if (mode === "morning") {
    column.addSpacer(6)
    addCenteredTopMessage(column, morningEncouragement())
  }

  column.addSpacer(5)

  const context = dayContextLine(mode, weather)
  const contextRow = column.addStack()
  contextRow.layoutHorizontally()
  contextRow.centerAlignContent()
  if (weather) contextRow.url = APP_URLS.weather
  contextRow.addSpacer()

  const label = contextRow.addText(context)
  label.font = Font.regularSystemFont(12)
  label.textColor = new Color(settings.secondaryText)
  label.centerAlignText()
  label.lineLimit = 1
  label.minimumScaleFactor = 0.75
  contextRow.addSpacer()

  if (!summaryText) return

  column.addSpacer(4)

  const summaryRow = column.addStack()
  summaryRow.layoutHorizontally()
  summaryRow.centerAlignContent()
  summaryRow.addSpacer()

  const summary = summaryRow.addText(summaryText)
  summary.font = Font.regularSystemFont(12)
  summary.textColor = new Color(settings.secondaryText)
  summary.centerAlignText()
  summary.lineLimit = 2
  summary.minimumScaleFactor = 0.7
  summaryRow.addSpacer()
}

function addCenteredTopMessage(parent, text) {
  const row = parent.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.addSpacer()

  const message = row.addText(text)
  message.font = Font.regularSystemFont(12)
  message.textColor = new Color(settings.secondaryText)
  message.centerAlignText()
  message.lineLimit = 2
  message.minimumScaleFactor = 0.72
  row.addSpacer()
}

function morningEncouragement() {
  return pickDailyMessage(MORNING_ENCOURAGEMENT)
}

function addCenteredIconLabel(widget, {symbol, text, width = 220, url = null, font, color, lineLimit = 1, minimumScaleFactor = 0.75}) {
  const wrapper = widget.addStack()
  wrapper.layoutHorizontally()
  wrapper.addSpacer()

  const row = wrapper.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.size = new Size(width, 0)
  if (url) row.url = url

  const textSlot = row.addStack()
  textSlot.layoutHorizontally()
  textSlot.centerAlignContent()
  textSlot.size = new Size(width, 0)
  textSlot.addSpacer()

  const icon = textSlot.addImage(SFSymbol.named(symbol).image)
  icon.imageSize = new Size(12, 12)
  icon.tintColor = color || new Color(settings.secondaryText)
  textSlot.addSpacer(5)

  const label = textSlot.addText(text)
  label.font = font || Font.regularSystemFont(12)
  label.textColor = color || new Color(settings.secondaryText)
  label.centerAlignText()
  label.lineLimit = lineLimit
  label.minimumScaleFactor = minimumScaleFactor

  const balanceSlot = textSlot.addStack()
  balanceSlot.size = new Size(17, 0)
  textSlot.addSpacer()

  wrapper.addSpacer()
}

function dayContextLine(mode, weather) {
  const parts = [formatDate(new Date())]
  if (modeLabel(mode)) parts.push(modeLabel(mode))
  if (weather) parts.push(`${Math.round(weather.temperature)}° ${weather.condition}`)
  return parts.join(" · ")
}

async function addCenteredPriority(widget, {mode, commute, events, defaultLocation = "", emptyText = "Nothing scheduled"}) {
  if (commute) {
    addCenteredCommutePriority(widget, commute)
    return
  }

  const event = events[0] || null
  if (!event) {
    addCenteredEmptyPriority(widget, mode, emptyText)
    return
  }

  const locationDetail = await getEventLocationDetail(event, defaultLocation)
  addCenteredEventPriority(widget, event, locationDetail, mode)
}

function addCenteredCommutePriority(widget, commute) {
  const column = centeredPriorityColumn(widget, commute.mapsURL || APP_URLS.maps)
  addCenteredPriorityIcon(column, commute.type === "nearbyEvent" ? "calendar" : transportSymbol(settings.preferredTransport))
  addCenteredPriorityTitle(column, commuteTitleText(commute))
  addCenteredPriorityDetail(column, commutePriorityDetail(commute))
}

function addCenteredEventPriority(widget, event, locationDetail = "", mode = "") {
  const column = centeredPriorityColumn(widget, APP_URLS.calendar)
  const flow = eventFlowSummary(event)
  addCenteredPriorityIcon(column, eventFlowSymbol(flow.key, mode))
  addCenteredPriorityTitle(column, event.title || "Untitled event")
  addCenteredPriorityDetail(column, locationDetail || eventContextText(event))
}

function addCenteredEmptyPriority(widget, mode, detail = "") {
  const flow = emptyEventFlow(mode)
  const column = centeredPriorityColumn(widget, APP_URLS.calendar)
  addCenteredPriorityIcon(column, eventFlowSymbol(flow.key, mode))
  addCenteredPriorityTitle(column, flow.label)
  addCenteredPriorityDetail(column, detail)
}

function centeredPriorityColumn(widget, url = null) {
  const wrapper = widget.addStack()
  wrapper.layoutHorizontally()
  wrapper.addSpacer()

  const column = wrapper.addStack()
  column.layoutVertically()
  column.centerAlignContent()
  column.size = new Size(250, 0)
  if (url) column.url = url

  wrapper.addSpacer()
  return column
}

function addCenteredPriorityIcon(column, symbol) {
  const row = column.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.addSpacer()
  const icon = row.addImage(SFSymbol.named(symbol).image)
  icon.imageSize = new Size(34, 34)
  icon.tintColor = new Color(settings.primaryText)
  row.addSpacer()
  column.addSpacer(8)
}

function addCenteredPriorityTitle(column, text) {
  const row = column.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.addSpacer()
  const title = row.addText(text)
  title.font = Font.semiboldSystemFont(21)
  title.textColor = new Color(settings.primaryText)
  title.centerAlignText()
  title.lineLimit = 2
  title.minimumScaleFactor = 0.58
  row.addSpacer()
}

function addCenteredPriorityDetail(column, text) {
  if (!text) return
  column.addSpacer(5)
  const row = column.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.addSpacer()
  const detail = row.addText(text)
  detail.font = Font.regularSystemFont(12)
  detail.textColor = new Color(settings.secondaryText)
  detail.centerAlignText()
  detail.lineLimit = 2
  detail.minimumScaleFactor = 0.7
  row.addSpacer()
}

function commuteTitleText(commute) {
  if (commute.type === "nearbyEvent") return commute.label || "Next event"
  return `Commute to ${commute.label}`
}

function commutePriorityDetail(commute) {
  const parts = []
  const detail = commuteDetailText(commute)
  if (detail) parts.push(detail)
  if (commute.traffic) parts.push(commute.traffic)
  return parts.join(" · ")
}

function addContentSpacer(widget) {
  widget.addSpacer(9)
}

function healthSummaryLine(health) {
  return `${formatNumber(health.steps)} steps · ${Math.round(health.move)} kcal · ${Math.round(health.exercise)} min`
}

function addCenteredHealthGlance(widget, health) {
  const wrapper = widget.addStack()
  wrapper.layoutHorizontally()
  wrapper.addSpacer()

  const column = wrapper.addStack()
  column.layoutVertically()
  column.centerAlignContent()
  column.size = new Size(230, 0)
  column.url = APP_URLS.healthSync

  addCenteredIconLabel(column, {
    symbol: "heart.fill",
    text: "Health",
    width: 230,
    font: Font.regularSystemFont(12),
    color: new Color(settings.secondaryText)
  })

  column.addSpacer(2)

  const valueRow = column.addStack()
  valueRow.layoutHorizontally()
  valueRow.centerAlignContent()
  valueRow.size = new Size(230, 0)
  valueRow.addSpacer()

  const value = valueRow.addText(health ? healthSummaryLine(health) : "Tap to Sync Health")
  value.font = Font.mediumSystemFont(13)
  value.textColor = health ? new Color(settings.primaryText) : new Color(settings.secondaryText)
  value.centerAlignText()
  value.lineLimit = 1
  value.minimumScaleFactor = 0.65
  valueRow.addSpacer()

  wrapper.addSpacer()
}

function addCenteredFastingGlance(widget) {
  const phase = getCurrentPhase(new Date())
  const wrapper = widget.addStack()
  wrapper.layoutHorizontally()
  wrapper.addSpacer()

  const column = wrapper.addStack()
  column.layoutVertically()
  column.centerAlignContent()
  column.size = new Size(190, 0)

  addCenteredIconLabel(column, {
    symbol: "timer",
    text: phase.isFasting ? "Fast" : "Eating window",
    width: 190,
    font: Font.regularSystemFont(12),
    color: new Color(settings.secondaryText)
  })

  column.addSpacer(2)

  const timerRow = column.addStack()
  timerRow.layoutHorizontally()
  timerRow.centerAlignContent()
  timerRow.size = new Size(190, 0)
  timerRow.addSpacer()

  const timer = timerRow.addDate(phase.end)
  timer.applyTimerStyle()
  timer.font = Font.mediumSystemFont(13)
  timer.textColor = new Color(settings.primaryText)
  timer.centerAlignText()
  timer.lineLimit = 1
  timer.minimumScaleFactor = 0.75
  timerRow.addSpacer()

  wrapper.addSpacer()
}

function addBatteryGlance(widget) {
  const level = Math.round(Device.batteryLevel() * 100)
  const charging = Device.isCharging()
  const symbol = batterySymbolName(level, charging)

  const wrapper = widget.addStack()
  wrapper.layoutHorizontally()
  wrapper.addSpacer()

  const column = wrapper.addStack()
  column.layoutVertically()
  column.size = new Size(92, 0)

  const iconRow = column.addStack()
  iconRow.layoutHorizontally()
  iconRow.centerAlignContent()
  iconRow.addSpacer()
  const icon = iconRow.addImage(SFSymbol.named(symbol).image)
  icon.imageSize = new Size(50, 28)
  icon.tintColor = new Color(settings.primaryText)
  iconRow.addSpacer()

  column.addSpacer(8)

  const levelRow = column.addStack()
  levelRow.layoutHorizontally()
  levelRow.centerAlignContent()
  levelRow.addSpacer()
  const levelText = levelRow.addText(`${level}\u2060%`)
  levelText.font = Font.semiboldSystemFont(31)
  levelText.textColor = new Color(settings.primaryText)
  levelText.centerAlignText()
  levelText.lineLimit = 1
  levelText.minimumScaleFactor = 0.65
  levelRow.addSpacer()

  column.addSpacer(3)

  const statusRow = column.addStack()
  statusRow.layoutHorizontally()
  statusRow.centerAlignContent()
  statusRow.addSpacer()
  const status = statusRow.addText(charging ? "Charging" : "Battery")
  status.font = Font.regularSystemFont(12)
  status.textColor = new Color(settings.secondaryText)
  status.centerAlignText()
  statusRow.addSpacer()

  wrapper.addSpacer()
}

function addNightGreeting(widget, health = null) {
  const column = widget.addStack()
  column.layoutVertically()
  column.centerAlignContent()

  const row = column.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.addSpacer()

  const text = row.addText(personalGreeting("Good night"))
  text.font = Font.semiboldSystemFont(30)
  text.textColor = new Color(settings.primaryText)
  text.centerAlignText()
  text.lineLimit = 2
  text.minimumScaleFactor = 0.62
  row.addSpacer()

  column.addSpacer(6)

  const messageRow = column.addStack()
  messageRow.layoutHorizontally()
  messageRow.centerAlignContent()
  messageRow.addSpacer()

  const message = messageRow.addText(nightlyEncouragement(health))
  message.font = Font.regularSystemFont(12)
  message.textColor = new Color(settings.secondaryText)
  message.centerAlignText()
  message.lineLimit = 2
  message.minimumScaleFactor = 0.72
  messageRow.addSpacer()
}

function nightlyEncouragement(health = null) {
  const completedMove = health && health.moveGoal > 0 && health.move >= health.moveGoal
  const completedExercise = health && health.exerciseGoal > 0 && health.exercise >= health.exerciseGoal
  const messages = completedMove || completedExercise
    ? NIGHT_CONGRATS
    : NIGHT_WISDOM

  return pickDailyMessage(messages)
}

function pickDailyMessage(messages) {
  const now = new Date()
  const seed = now.getFullYear() * 1000 + dayOfYear(now)
  return messages[seed % messages.length]
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date - start) / 86400000)
}

function batterySymbolName(level, charging) {
  if (charging) return "battery.100.bolt"
  if (level >= 95) return "battery.100"
  if (level >= 65) return "battery.75"
  if (level >= 35) return "battery.50"
  if (level >= 15) return "battery.25"
  return "battery.0"
}

function renderSections(widget, sections) {
  const activeSections = sections.filter(Boolean)
  if (!activeSections.length) return

  // Flexible spacers let each time-of-day layout breathe into the same large
  // widget height, instead of clustering short modes at the top.
  widget.addSpacer()
  activeSections.forEach((render, index) => {
    render()
    if (index < activeSections.length - 1) widget.addSpacer()
  })
}

function addFooter(widget) {
  const row = widget.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()
  row.addSpacer()

  const updated = row.addText(`Last updated ${formatShortTime(new Date())}`)
  updated.font = Font.regularSystemFont(10)
  updated.textColor = new Color(settings.secondaryText)
  updated.lineLimit = 1
  updated.minimumScaleFactor = 0.8

  row.addSpacer()
}

// MARK: - Appearance Helpers

function applyWidgetBackground(widget, mode = getDashboardMode(), weather = null) {
  if (settings.backgroundStyle === "personal") {
    const palette = weatherAwarePalette(personalBackgroundPalette(mode), weather)
    const gradient = new LinearGradient()
    gradient.colors = palette.colors.map(color => new Color(color))
    gradient.locations = palette.locations
    gradient.startPoint = palette.start
    gradient.endPoint = palette.end
    widget.backgroundGradient = gradient
  } else if (settings.backgroundStyle === "gradient") {
    const gradient = new LinearGradient()
    gradient.colors = [
      new Color(settings.background),
      new Color(settings.backgroundSecondary || settings.background)
    ]
    gradient.locations = [0, 1]
    gradient.startPoint = new Point(0, 0)
    gradient.endPoint = new Point(1, 1)
    widget.backgroundGradient = gradient
  } else {
    widget.backgroundColor = new Color(settings.background)
  }
}

function weatherAwarePalette(palette, weather) {
  const accent = weatherAccentColor(weather?.weatherCode)
  if (!accent) return palette

  const colors = [...palette.colors]
  const finalIndex = colors.length - 1
  colors[finalIndex] = blendHex(colors[finalIndex], accent, 0.18)

  return {
    colors,
    locations: palette.locations,
    start: palette.start,
    end: palette.end
  }
}

function weatherAccentColor(code) {
  if (code === null || code === undefined) return null
  const numeric = Number(code)
  if (numeric === 0 || numeric === 1) return "#B58A62"
  if (numeric === 2 || numeric === 3) return "#83939B"
  if ([45, 48].includes(numeric)) return "#738188"
  if (numeric >= 51 && numeric <= 67) return "#587386"
  if (numeric >= 71 && numeric <= 77) return "#A8B4BA"
  if (numeric >= 80 && numeric <= 82) return "#4D6D82"
  if (numeric >= 95) return "#69667E"
  return null
}

function blendHex(base, overlay, amount) {
  const baseRgb = hexToRgb(base)
  const overlayRgb = hexToRgb(overlay)
  if (!baseRgb || !overlayRgb) return base

  const mix = baseRgb.map((value, index) => Math.round(value * (1 - amount) + overlayRgb[index] * amount))
  return rgbToHex(mix)
}

function hexToRgb(value) {
  const hex = normaliseHex(value)
  if (!hex) return null
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ]
}

function rgbToHex(values) {
  return `#${values.map(value => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`
}

function backgroundStyleLabel() {
  const preset = String(settings.backgroundPreset || "custom")
    .replace(/-/g, " ")
    .replace(/\b\w/g, character => character.toUpperCase())

  if (settings.backgroundStyle === "personal") return "Personal Glow"

  return settings.backgroundStyle === "gradient"
    ? `${preset} Gradient`
    : `${preset} Solid`
}

function personalBackgroundPalette(mode) {
  // Personal Glow follows the day with quiet sky tones, while keeping enough
  // contrast for Apple's dark widget surfaces and white text.
  if (mode === "morning") return {
    colors: ["#1B1D2B", "#4A6D82", "#D79B72"],
    locations: [0, 0.58, 1],
    start: new Point(0, 0),
    end: new Point(1, 1)
  }

  if (mode === "work") return {
    colors: ["#0F1820", "#35576A", "#8AA6B2"],
    locations: [0, 0.62, 1],
    start: new Point(0, 0),
    end: new Point(1, 1)
  }

  if (mode === "evening") return {
    colors: ["#18131C", "#5B3A4E", "#C07A5A"],
    locations: [0, 0.58, 1],
    start: new Point(0, 0),
    end: new Point(1, 1)
  }

  return {
    colors: ["#050608", "#171B27", "#2B3148"],
    locations: [0, 0.62, 1],
    start: new Point(0, 0),
    end: new Point(1, 1)
  }
}

function normaliseHex(value) {
  const cleaned = String(value || "").trim().replace(/^#/, "")
  return /^[0-9A-Fa-f]{6}$/.test(cleaned) ? `#${cleaned.toUpperCase()}` : null
}

// MARK: - Utilities

function loadSettings() {
  const loaded = {...DEFAULTS, ...readLocalJSON(SETTINGS_PATH, {})}

  // Older Pulse installs defaulted to Midnight. Treat that stock choice as the
  // new day-cycle Personal Glow, while leaving deliberate custom presets alone.
  if (loaded.backgroundStyle === "solid" && loaded.backgroundPreset === "midnight") {
    loaded.backgroundStyle = "personal"
    loaded.backgroundPreset = "personal-glow"
    loaded.background = DEFAULTS.background
    loaded.backgroundSecondary = DEFAULTS.backgroundSecondary
    loaded.cardBackground = DEFAULTS.cardBackground
  }

  if (!Array.isArray(loaded.workdays) || !loaded.workdays.length) {
    loaded.workdays = [...DEFAULTS.workdays]
  }
  if (!["driving", "walking", "cycling"].includes(loaded.preferredTransport)) {
    loaded.preferredTransport = DEFAULTS.preferredTransport
  }
  if (!Number.isFinite(Number(loaded.commuteMinDistanceMiles))) {
    loaded.commuteMinDistanceMiles = DEFAULTS.commuteMinDistanceMiles
  }
  if (!Number.isFinite(Number(loaded.commuteMinTravelMinutes))) {
    loaded.commuteMinTravelMinutes = DEFAULTS.commuteMinTravelMinutes
  }

  return loaded
}

function saveSettings() {
  fm.writeString(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function readLocalJSON(path, fallback = null) {
  if (!fm.fileExists(path)) return fallback
  try { return parseLooseJSON(fm.readString(path), fallback) }
  catch (_) { return fallback }
}

// Scriptable keeps iCloud files as stubs until downloaded, so all companion
// Shortcut JSON reads pass through this helper before parsing.
async function readICloudJSON(path, fallback = null) {
  if (!icloud.fileExists(path)) return fallback
  if (!icloud.isFileDownloaded(path)) await icloud.downloadFileFromiCloud(path)
  try { return parseLooseJSON(icloud.readString(path), fallback) }
  catch (_) { return fallback }
}

function parseLooseJSON(text, fallback = null) {
  try { return JSON.parse(text) }
  catch (_) {
    // Shortcuts text templates can accidentally save blank values such as
    // `"exercise": ,` or malformed keys such as `"exercise:`. Repair the common
    // blank-value case first, then fall back to extracting known numeric fields.
    const repaired = String(text).replace(/:\s*(?=[,}])/g, ": 0")
    try { return JSON.parse(repaired) }
    catch (_) {
      const extracted = extractLooseNumbers(text)
      return Object.keys(extracted).length ? extracted : fallback
    }
  }
}

function extractLooseNumbers(text) {
  const source = String(text || "")
  const keys = [
    "steps", "move", "moveGoal", "exercise", "exerciseGoal",
    "travelMinutes", "distanceMiles", "updatedAt"
  ]
  const result = {}

  for (const key of keys) {
    const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, "i")
    const match = source.match(pattern)
    if (match) result[key] = Number(match[1])
  }

  return result
}

async function readFirstICloudJSON(paths, fallback = null) {
  for (const path of paths) {
    const data = await readICloudJSON(path)
    if (data) return data
  }
  return fallback
}

function startOfDay(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date) {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

function startOfTomorrow() {
  return startOfDay(addDays(new Date(), 1))
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function dateAtTime(date, hour, minute) {
  const result = new Date(date)
  result.setHours(hour, minute, 0, 0)
  return result
}

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes()
}

function minutesFromMidnight(hour, minute) {
  return hour * 60 + minute
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

function formatDate(date) {
  const formatter = new DateFormatter()
  formatter.locale = "en_GB"
  formatter.dateFormat = "EEEE, d MMMM"
  return formatter.string(date)
}

function formatShortTime(date) {
  const formatter = new DateFormatter()
  formatter.locale = "en_GB"
  formatter.useNoDateStyle()
  formatter.useShortTimeStyle()
  return formatter.string(date)
}

function formatReminderDue(reminder) {
  if (!reminder.dueDate) return ""
  if (isSameDay(reminder.dueDate, new Date())) {
    return reminder.dueDateIncludesTime ? formatShortTime(reminder.dueDate) : "Today"
  }
  if (isSameDay(reminder.dueDate, startOfTomorrow())) return "Tomorrow"

  const formatter = new DateFormatter()
  formatter.locale = "en_GB"
  formatter.dateFormat = "d MMM"
  return formatter.string(reminder.dueDate)
}

function formatEventTime(event) {
  return event.isAllDay ? "All day" : formatShortTime(event.startDate)
}

function eventGlanceText(event) {
  const title = event.title || "Untitled event"
  return `${title} · ${relativeEventTime(event)}`
}

function eventContextText(event) {
  const location = compactEventLocation(event.location)
  return location
    ? `${formatEventTime(event)} · ${location}`
    : relativeEventTime(event)
}

function compactEventLocation(location) {
  const text = normaliseEventLocation(location)
  if (!text) return ""
  return text.split(/\s*[;|]\s*/)[0].replace(/\s+-\s+.*$/, "").trim()
}

function eventFlowSummary(event, now = new Date()) {
  if (event.isAllDay) return {key: "today", label: "Today"}
  if (event.startDate <= now && event.endDate >= now) return {key: "now", label: "Now"}

  const tomorrow = startOfTomorrow()
  if (isSameDay(event.startDate, tomorrow)) return {key: "tomorrow", label: "Tomorrow"}

  const dayGap = Math.floor((startOfDay(event.startDate).getTime() - startOfDay(now).getTime()) / 86400000)
  if (dayGap > 1) return {key: "upcoming", label: "Upcoming"}

  const minutes = Math.round((event.startDate.getTime() - now.getTime()) / 60000)
  return minutes > 360
    ? {key: "later", label: "Later Today"}
    : {key: "next", label: "Next"}
}

function emptyEventFlow(mode) {
  if (mode === "evening") return {key: "evening", label: "Evening"}
  if (mode === "work") return {key: "work", label: "Work"}
  if (mode === "dayOff") return {key: "today", label: "Day Off"}
  return {key: "today", label: "Today"}
}

function eventFlowSymbol(key, mode) {
  if (mode === "evening" && (key === "tomorrow" || key === "evening")) return "sunset.fill"
  if (key === "now") return "clock.fill"
  if (key === "next") return "calendar"
  if (key === "later") return "clock"
  if (key === "tomorrow") return "calendar"
  if (key === "evening") return "sunset.fill"
  if (key === "upcoming") return "calendar.badge.plus"
  if (key === "work" || mode === "work") return "briefcase.fill"
  if (mode === "dayOff") return "sparkles"
  return "sunrise.fill"
}

function relativeEventTime(event, now = new Date()) {
  if (event.isAllDay) return "all day"
  if (isSameDay(event.startDate, startOfTomorrow())) return `tomorrow at ${formatShortTime(event.startDate)}`

  const dayGap = Math.floor((startOfDay(event.startDate).getTime() - startOfDay(now).getTime()) / 86400000)
  if (dayGap > 1) return `in ${dayGap} days`

  const minutes = Math.round((event.startDate.getTime() - now.getTime()) / 60000)
  if (minutes <= 0) return "now"
  return `in ${formatDurationCompact(minutes)}`
}

function dayAheadSummary(events, reminders, weather) {
  const parts = []
  if (events.length) parts.push(`${events.length} event${events.length === 1 ? "" : "s"}`)
  if (reminders.length) parts.push(`${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`)
  if (weather?.today) {
    parts.push(`${Math.round(weather.today.maximum)}° high`)
    if (weather.today.rainChance !== null && weather.today.rainChance !== undefined) {
      parts.push(`${Math.round(weather.today.rainChance)}% rain`)
    }
  }
  return parts.length ? parts.join(" · ") : "A quiet day ahead"
}

function workSummary(workReminders, personalReminders) {
  const total = workReminders.length + personalReminders.length
  if (!total) return "Reminders clear"
  return `${workReminders.length} work · ${personalReminders.length} personal reminder${total === 1 ? "" : "s"}`
}

function workDaySummary(events, workReminders, personalReminders) {
  const parts = []
  if (events.length) parts.push(`${events.length} work event${events.length === 1 ? "" : "s"}`)
  const total = workReminders.length + personalReminders.length
  if (total) parts.push(`${total} reminder${total === 1 ? "" : "s"}`)
  return parts.length ? parts.join(" · ") : "Work is clear"
}

function workSupportLine(workReminders, personalReminders) {
  if (workReminders.length) return `Work: ${workReminders[0].title}`
  if (personalReminders.length) return `Personal today: ${personalReminders[0].title}`
  return "Reminders clear"
}

function dayOffSummary(reminders, weather) {
  const parts = []
  if (weather?.today) parts.push(`${Math.round(weather.today.maximum)}° high`)
  if (reminders.length) parts.push(`${reminders.length} personal reminder${reminders.length === 1 ? "" : "s"}`)
  return parts.length ? parts.join(" · ") : "A quieter day"
}

function personalSupportLine(reminders, workReminders) {
  if (reminders.length) return `${reminders.length} personal reminder${reminders.length === 1 ? "" : "s"}`
  if (workReminders.length) return `Work today: ${workReminders[0].title}`
  return "Reminders clear"
}

function eveningSummary(weather, reminders) {
  const parts = []
  if (weather?.tomorrow) parts.push(`${Math.round(weather.tomorrow.maximum)}° tomorrow`)
  if (reminders.length) parts.push(`${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`)
  return parts.length ? parts.join(" · ") : "Wind down"
}

function fastingMetaText() {
  const phase = getCurrentPhase(new Date())
  return phase.isFasting
    ? `Fast ends ${formatShortTime(phase.end)}`
    : `Fast starts ${formatShortTime(phase.end)}`
}

function formatDuration(totalMinutes) {
  const safe = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  return hours ? `${hours}h ${String(minutes).padStart(2, "0")}m` : `${minutes}m`
}

function formatDurationCompact(totalMinutes) {
  const safe = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  if (!hours) return `${minutes}m`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function formatSettingsTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function parseTime(value) {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  return match ? {hour: Number(match[1]), minute: Number(match[2])} : null
}

function formatISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function isTodayishDate(value) {
  if (value instanceof Date) return isSameDay(value, new Date())

  const text = String(value || "").trim()
  if (!text) return true
  if (text === formatISODate(new Date())) return true

  const parsed = new Date(text)
  return Number.isFinite(parsed.getTime()) ? isSameDay(parsed, new Date()) : true
}

function firstNumber(source, keys, fallback = 0) {
  for (const key of keys) {
    if (source[key] === null || source[key] === undefined || source[key] === "") continue
    const number = Number(String(source[key]).replace(/,/g, ""))
    if (Number.isFinite(number)) return number
  }
  return fallback
}

function parseHealthTimestamp(value) {
  if (value === null || value === undefined || value === "") return 0
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric

  const parsed = new Date(String(value))
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0
}

function formatNumber(value) {
  return Number(value).toLocaleString("en-GB")
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function positiveNumberOrFallback(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function numberOrFallback(value, fallback) {
  return positiveNumberOrFallback(value, fallback)
}

function clampProgress(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
}

function titleCase(value) {
  return String(value).replace(/\b\w/g, character => character.toUpperCase())
}

function titleCaseLabel(value) {
  const special = {
    "NEXT": "Next",
    "WORK TODAY": "Work Today",
    "WORK REMINDERS": "Work Reminders",
    "PRIORITIES": "Priorities",
    "TOMORROW": "Tomorrow",
    "TOMORROW · WORK": "Tomorrow · Work",
    "STILL TO DO": "Still to Do",
    "FIRST TOMORROW": "First Tomorrow",
    "TODAY": "Today"
  }

  const text = String(value || "")
  return special[text] || titleCase(text)
}

async function showMessage(title, message) {
  const alert = new Alert()
  alert.title = title
  alert.message = message
  alert.addAction("OK")
  await alert.presentAlert()
}
