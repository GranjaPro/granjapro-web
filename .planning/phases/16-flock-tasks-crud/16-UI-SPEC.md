# UI Design Contract: Phase 16 (Flock Tasks CRUD)

This document defines the UI/UX specifications for the Phase 16 tasks interface. It ensures visual consistency, responsive design, and clear user flows before implementation begins.

## 1. Overview
The tasks interface operates within the Operational tab of a Flock's details page. It is a central hub for farm workers to see what needs to be done, grouped chronologically.

## 2. Layout Strategy

### Main View (List View)
- **Container**: A clean, single-column list optimized for both mobile and desktop.
- **Header**:
  - **Title**: "Tarefas do Lote" (Flock Tasks).
  - **Actions**: A prominent primary button to "Nova Tarefa" (New Task).
- **Filters**:
  - Horizontal scrollable pill/chip row for Category filtering (All, Sanitary, Feed, Water, etc.).
- **Groups**:
  - Tasks are grouped under distinct section headers: **Vencidas** (Overdue, red text), **Hoje** (Today, default text), and **Próximas** (Upcoming, gray text).
  - Completed tasks are moved to a separate section or visually struck through at the bottom of the "Today" group, under a **Concluídas** (Completed) header.

### Task Item (Card/Row)
- **Visuals**: A clean, white card with a subtle border and shadow (Tailwind: `bg-white border shadow-sm rounded-lg`).
- **Left Side**:
  - **Checkbox**: Large, tap-friendly circle. When checked, transitions smoothly to a filled state.
  - **Icon**: A container with a background color matching the category (e.g., green for Sanitary with a shield icon).
- **Body**:
  - **Title**: Bold, dark text.
  - **Metadata Row**: Scheduled time and Recurrence badge (e.g., "🔄 Diária").
- **Right Side**:
  - **Priority Badge**: Small pill indicating priority (High = Red, Medium = Yellow, Low = Gray).
  - **Actions Menu**: Vertical ellipsis `⋮` opening a dropdown (Edit, Delete).

## 3. Interaction Design (Task Dialog)

### The Modal/Drawer
- On desktop: Centered Dialog box.
- On mobile: Bottom Drawer (slides up from bottom) for easier reachability.

### Form Fields
1. **Title**: Text Input, required.
2. **Category**: Select/Radio group. Selecting a category immediately previews the icon.
3. **Priority**: Segmented Control (Baixa, Média, Alta).
4. **Recurrence**: Select (Única, Diária, Semanal, Mensal).
5. **Scheduled Time**: Time picker (`<input type="time">`).
6. **Notes**: Textarea (optional).

## 4. Visual Language & Mapping

### Category to Icon/Color Mapping
- **Sanitário (Saúde)**: `ShieldCheck` icon, Emerald theme (`bg-emerald-50 text-emerald-700`).
- **Alimentação**: `Wheat` icon, Orange theme (`bg-orange-50 text-orange-700`).
- **Limpeza**: `Droplets` icon, Blue theme (`bg-blue-50 text-blue-700`).
- **Coleta**: `Egg` icon, Amber theme (`bg-amber-50 text-amber-700`).
- **Inspeção**: `Eye` icon, Purple theme (`bg-purple-50 text-purple-700`).
- **Geral**: `Clipboard` icon, Gray theme (`bg-gray-100 text-gray-700`).

### Priority Badges
- **Alta**: Red background, dark red text.
- **Média**: Yellow/Amber background, dark amber text.
- **Baixa**: Light gray background, dark gray text.
