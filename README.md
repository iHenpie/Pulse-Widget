# Pulse

Pulse is a personal large widget for [Scriptable](https://scriptable.app/) on iPhone. It changes through the day, showing a calm morning, work, day-off, evening, or night layout.

It is designed to feel more like an Apple “at a glance” surface than a dense dashboard: one priority, a few quiet signals, and personal context.

## Screenshots

These screenshots use mock data only.

| Morning | Work |
| --- | --- |
| ![Pulse morning widget preview](screenshots/pulse-morning.png) | ![Pulse work widget preview](screenshots/pulse-work.png) |

| Evening | Night |
| --- | --- |
| ![Pulse evening widget preview](screenshots/pulse-evening.png) | ![Pulse night widget preview](screenshots/pulse-night.png) |

## What It Shows

- Time-of-day layouts: Morning, Work, Day Off, Evening, Night
- Weather-aware background using a subtle day-cycle glow
- Next event or commute as the central callout
- Health stats from a companion Shortcut
- Live fasting timer
- Work and personal reminder summaries
- Night battery, alarm, event, and encouragement
- Daily rotating morning and night messages

## Requirements

- iPhone with Scriptable installed
- iCloud Drive enabled for Scriptable
- Optional: Apple Shortcuts for Health sync
- Optional: Calendar, Reminders, Location, Weather permissions

## Install

1. Open `Pulse_Scriptable.js`.
2. Copy the full script into Scriptable.
3. Name the script `Pulse`.
4. Add a large Scriptable widget to your Home Screen.
5. Set the widget script to `Pulse`.
6. Run the script once inside Scriptable to open settings and initial setup.

## Health Sync

Pulse reads health data from:

```text
iCloud Drive/Scriptable/pulse-health.json
```

The companion Shortcut should save JSON like this:

```json
{
  "steps": 5106,
  "move": 335,
  "moveGoal": 600,
  "exercise": 8,
  "exerciseGoal": 30,
  "updatedAt": 1784563200000
}
```

If the file is missing, Pulse shows a friendly Sync Health prompt. Tapping the Health section opens:

```text
shortcuts://run-shortcut?name=Pulse%20Sync
```

## Companion Files

Pulse can also read optional files from Scriptable’s iCloud folder:

```text
pulse-health.json
pulse-alarm.json
pulse-commute.json
```

Examples are included in `examples/`.

## Settings

Run the script in Scriptable to configure:

- Name
- Home and work locations
- Work days
- Calendar and reminder lists
- Commute settings
- Preferred transport
- Background style
- Fasting schedule
- Preview mode for each layout

## Current Status

Pulse is a prototype. It works as a Scriptable widget, but it is still evolving. The long-term idea is to turn the concept into a native app with a proper setup flow and widget extension.

## Privacy

Pulse runs locally in Scriptable. It reads local/iCloud files and Apple data that Scriptable is given permission to access. Health data is provided by your own Shortcut through a local JSON file.

Weather and route estimates may use external web requests depending on the feature:

- Open-Meteo for weather
- OpenStreetMap/Nominatim and OSRM for event location and route estimates

## Not Affiliated

Pulse is not affiliated with Apple, Scriptable, Open-Meteo, OpenStreetMap, or OSRM.
