# Cricket Core 2026 - Embed Shortcodes Guide

This document outlines the available embed views (shortcodes) for the Cricket Core 2026 Management System. These views are designed to be embedded into external websites, such as WordPress or custom HTML pages, using iframes.

## Base URL Parameters

All embed URLs must include the following parameter:
- `mode=embed`: Activates the optimized embed layout (hides headers, navigation, and footer).

## Available Views

| View Name | `view` Parameter | Description | Required Context |
| :--- | :--- | :--- | :--- |
| **Global Player Registry** | `player_search` | A searchable list of all players and their team affiliations. | None |
| **Team List** | `team_list` | Displays an organization's member teams and basic info. | `orgId`, `id` (sets `id` to `orgId`) |
| **Tournament Dashboard** | `tournament` | Full view of a tournament (defaults to Overview). | `tournamentId`, `orgId` |
| **Standings Table** | `standings` | Real-time standings/points table for a tournament. | `tournamentId`, `orgId` |
| **Fixtures List** | `fixtures` | Upcoming and completed match fixtures for a tournament. | `tournamentId`, `orgId` |
| **Knockout Bracket** | `bracket` | Visual knockout bracket for tournament finals. | `tournamentId`, `orgId` |
| **Groups Overview** | `groups` | Group-wise team listings for a tournament. | `tournamentId`, `orgId` |

## URL Construction Examples

### 1. Global Player Registry
`https://app.cricketcore.com/?mode=embed&view=player_search`

### 2. Organization Team List
`https://app.cricketcore.com/?mode=embed&view=team_list&orgId=ORG_123&id=ORG_123`

### 3. Tournament Standings
`https://app.cricketcore.com/?mode=embed&view=standings&orgId=ORG_123&tournamentId=TRN_456`

## Implementation (Iframe)

To embed a view, use the following iframe template:

```html
<iframe 
  src="[YOUR_GENERATED_URL]" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border:0; width:100%; height:800px; display:block;"
></iframe>
```

> [!TIP]
> You can generate these codes directly within the **Admin Center** by clicking the **"Embed & Share"** button in the bottom right corner of the dashboard.
