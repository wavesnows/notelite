# YesnoteLite User Guide

## 📖 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Interface Overview](#interface-overview)
4. [Core Features](#core-features)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Git Sync](#git-sync)
7. [Version History](#version-history)
8. [Advanced Features](#advanced-features)
9. [FAQ](#faq)
10. [Tips & Best Practices](#tips--best-practices)

---

## Introduction

YesnoteLite is a clean and efficient Markdown note-taking application designed for users who need to quickly capture and organize ideas.

### Core Features

- 🎨 **WYSIWYG Editor** - Based on EditorJS, supports rich text editing
- 📁 **Folder Organization** - Flexible folder structure with unlimited nesting
- 🔄 **Git Sync** - Built-in GitHub sync with automatic version control
- ⏱️ **Auto-Save** - Auto-save every 30 seconds, never lose data
- 🔍 **Full-Text Search** - Quickly find all note content
- ⭐ **Favorites & Pin** - One-click favorite and pin important notes
- 📜 **Version History** - Complete version history based on Git
- ⌨️ **Keyboard Shortcuts** - Efficient keyboard operations

### System Requirements

- **macOS**: 10.12 or higher
- **Disk Space**: At least 200 MB
- **Memory**: 4 GB or more recommended

---

## Getting Started

### Installation

1. Download the installer for your chip:
   - Apple Silicon (M1/M2/M3): `YesnoteLite-0.1.0-arm64.dmg`
   - Intel chip: `YesnoteLite-0.1.0-x64.dmg`

2. Double-click the DMG file and drag the app to the Applications folder

3. On first launch, if you see "Cannot be opened" prompt:
   - Open `System Preferences` → `Security & Privacy`
   - Click "Open Anyway" button
   - Or run in Terminal: `xattr -cr /Applications/YesnoteLite.app`

### First Use

1. After launching, a default notebook will be created at `~/YesnoteLite/repos/default/`
2. Left side shows file tree with all notes and folders
3. Right side is the editor where you can start creating notes
4. Click the `+` button in the top left to create a root folder

---

## Interface Overview

### Main Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🔴🟡🟢  [DevTools] [JSON]    [Breadcrumb]    🔍 [Search] [Tools] │
├──────────┬──────────────────────────────────────────────────┤
│          │  Title                                             │
│  File    │  ─────────────────────────────────────────────   │
│  Tree    │                                                    │
│          │  Editor Content Area                               │
│  📁 Folder│  (1000px wide)                                    │
│  📄 Note  │                                                    │
│          │                                                    │
│  ⭐ Fav   │                                                    │
│          │                                                    │
├──────────┴──────────────────────────────────────────────────┤
│  File Info | Save Status | Git Status                        │
└─────────────────────────────────────────────────────────────┘
```

### Interface Elements

#### 1. Top Toolbar (from left to right)

- **Window Control Buttons**
  - 🔴 Close window
  - 🟡 Minimize
  - 🟢 Maximize/Fullscreen

- **Developer Tools Button**
  - 🖥️ Open/close developer tools (for debugging)
  - 📄 Edit raw JSON (advanced feature)

- **Breadcrumb Navigation**
  - Shows current note's path
  - Click folder to expand left tree structure
  - Format: `Notebook / Folder / Subfolder / Note Name`

- **Search Bar**
  - 🔍 Full-text search all notes
  - Supports real-time search
  - Press ESC to clear search

- **Git Status Indicator**
  - Shows uncommitted/unpushed changes count
  - Click to quickly push to GitHub
  - Only shown in remote notebooks

- **Tool Buttons**
  - 🗑️ Delete current note
  - 🔒 Lock/unlock edit mode
  - 🕐 View version history

#### 2. Left Sidebar

**File Tree Area**
- Shows hierarchical structure of all notes and folders
- Supports drag-and-drop sorting (coming soon)
- Folders can be expanded/collapsed

**File/Folder Operations** (click ⚙️ icon)
- 📄 Create File (folders only)
- 📁 Create Subfolder (folders only)
- 📌 Pin Note (files only)
- ⭐ Favorite Note (files only)
- 🗑️ Delete

**Favorites Sidebar** (click ⭐ icon at bottom)
- 📌 Pinned Notes - Quick access to important notes
- ⭐ Starred Notes - Mark favorite notes

**Control Buttons** (bottom)
- ➕ Add Root Folder
- 🔄 Git Sync (pull/push)
- ⚙️ Settings

#### 3. Editor Area

**Title Bar**
- Display and edit note title
- Auto-save

**Editor**
- Click `+` to add different content blocks
- Supported block types:
  - 📝 Paragraph
  - # Header (H1-H6)
  - 📋 List (ordered/unordered)
  - ✅ Checklist
  - 💬 Quote
  - 💻 Code Block
  - 📊 Table
  - ⚠️ Warning

**Toolbar** (shown when text is selected)
- **B** Bold
- *I* Italic
- <u>U</u> Underline
- 🔗 Insert Link

#### 4. Bottom Status Bar

- **Left**: File name, size, modification time
- **Middle**: Save status (Saving/Saved/Failed)
- **Right**: Git operation status

---

## Core Features

### 1. Note Management

#### Creating Notes

**Method 1: Through File Tree**
1. Find target folder in left file tree
2. Click ⚙️ icon next to folder
3. Select "Create File"
4. Enter file name and confirm

**Method 2: Through Root Folder**
1. Click ➕ button at bottom left
2. Create new root folder
3. Create notes in new folder

#### Editing Notes

1. Click note name in left file tree
2. Note content opens in right editor
3. Directly edit title and content
4. App auto-saves every 30 seconds

#### Deleting Notes

1. Find note to delete in left file tree
2. Click ⚙️ icon next to note
3. Select "Delete"
4. Confirm deletion

**Note**: Deletion cannot be undone, use with caution!

### 2. Folder Management

#### Creating Folders

**Create Root Folder**
1. Click ➕ button at bottom left
2. Enter folder name
3. Click OK

**Create Subfolder**
1. Click ⚙️ icon next to parent folder
2. Select "Create Subfolder"
3. Enter folder name
4. Click OK

#### Organization Structure

- Supports unlimited folder nesting
- Recommend no more than 3-4 levels for clarity
- Maximum 6 root folders

**Recommended Folder Structure**
```
📁 Work
  📁 Project A
    📄 Requirements
    📄 Meeting Notes
  📁 Project B
📁 Learning
  📁 Programming
  📁 Design
📁 Personal
  📄 Journal
  📄 Ideas
```

### 3. Editor Features

#### Adding Content Blocks

1. Click `+` button on left side of editor
2. Select block type from menu
3. Start typing content

#### Block Types

**Paragraph**
- Basic text block
- Supports inline formatting: bold, italic, underline, link

**Header**
- 6 levels: H1 to H6
- Shortcut: `Cmd+Shift+H`
- For document structure

**List**
- Ordered list (1, 2, 3...)
- Unordered list (• • •)
- Supports multi-level nesting

**Checklist**
- ☐ Incomplete item
- ☑ Complete item
- Shortcut: `Cmd+Shift+K`
- Good for task management

**Quote**
- For quoting others
- Or emphasizing important content

**Code Block**
- For code snippets
- Preserves formatting and indentation
- Shortcut: `Cmd+Shift+C`

**Table**
- Create structured data
- Adjustable rows and columns
- Shortcut: `Cmd+Shift+T`
- Supports header row

**Warning**
- Title + message
- For important alerts
- Shortcut: `Cmd+Shift+W`

#### Text Formatting

Inline toolbar appears when text is selected:

- **Bold**: Select text, click **B** or press `Cmd+B`
- **Italic**: Select text, click *I* or press `Cmd+I`
- **Underline**: Select text, click <u>U</u>
- **Link**: Select text, click 🔗, enter URL

#### Block Operations

- **Move Block**: Drag the drag handle on left side of block
- **Delete Block**: Click ⚙️ on right side of block, select delete
- **Convert Block**: Click ⚙️ on right side of block, select convert to other type

### 4. Search Feature

#### Full-Text Search

1. Click search bar at top or press `Cmd+F`
2. Enter search keywords
3. Results display in real-time
4. Click result to open corresponding note

#### Search Tips

- Search matches note titles and content
- Supports Chinese and English search
- Case-insensitive
- Press ESC to clear search and close results

#### Filter File Tree

1. Type in filter box above left file tree
2. File tree shows only matching notes
3. Clear input to restore full display

### 5. Favorites Feature

#### Pin Notes

**Pin Operation**
1. Right-click note or click ⚙️ icon
2. Select "Pin Note"
3. Note moves to top of folder

**Unpin**
1. Right-click pinned note
2. Select "Unpin"

**Usage**
- Quick access to ongoing projects
- Highlight important documents
- Temporarily prioritize certain notes

#### Star Notes

**Star Operation**
1. Right-click note or click ⚙️ icon
2. Select "Star Note"
3. ⭐ icon appears next to note

**View Favorites**
1. Click ⭐ button at bottom left
2. Favorites sidebar slides out
3. Shows all starred notes
4. Click note to open quickly

**Unstar**
1. Right-click starred note
2. Select "Unstar"

**Difference**
- **Pin**: Sorts higher within current folder
- **Star**: Global favorites, cross-folder access

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Function | Description |
|----------|----------|-------------|
| `Cmd+?` | Show Shortcut Help | View all available shortcuts |
| `Cmd+S` | Save Note | Manually save current note |
| `Cmd+F` | Search | Open search bar |
| `Cmd+Shift+P` | Git Push | Push changes to GitHub |
| `ESC` | Cancel/Close | Close dialog or clear search |

### Editor Shortcuts

| Shortcut | Function | Description |
|----------|----------|-------------|
| `Cmd+B` | Bold | Make selected text bold |
| `Cmd+I` | Italic | Make selected text italic |
| `Cmd+K` | Insert Link | Add link to selected text |
| `Cmd+Shift+H` | Insert Header | Add header block |
| `Cmd+Shift+C` | Insert Code Block | Add code block |
| `Cmd+Shift+T` | Insert Table | Add table block |
| `Cmd+Shift+K` | Insert Checklist | Add checklist item |
| `Cmd+Shift+W` | Insert Warning | Add warning box |
| `Tab` | Indent | Increase indentation in lists |
| `Shift+Tab` | Unindent | Decrease indentation in lists |
| `Enter` | New Line | Create new content block |
| `Backspace` | Delete | Delete empty block |

### Window Shortcuts

| Shortcut | Function | Description |
|----------|----------|-------------|
| `Cmd+W` | Close Window | Close app window |
| `Cmd+M` | Minimize | Minimize window |
| `Cmd+Q` | Quit App | Completely quit app |

---

## Git Sync

### Setting Up GitHub Sync

#### Preparation

1. **Create GitHub Repository**
   - Log in to GitHub.com
   - Click `+` in top right → `New repository`
   - Enter repository name (e.g., `my-notes`)
   - Select Private
   - Don't initialize README
   - Click `Create repository`

2. **Create Personal Access Token**
   - Go to GitHub Settings → Developer settings
   - Select Personal access tokens → Tokens (classic)
   - Click `Generate new token (classic)`
   - Check permissions: `repo` (full repository access)
   - Click `Generate token`
   - **Copy token** (shown only once, save securely)

#### Configure App

1. Click ⚙️ settings button at bottom left
2. Switch to "Remote Settings" tab
3. Fill in the following:
   - **GitHub Username**: Your GitHub username
   - **GitHub Token**: Token just created
   - **Repository Name**: Repository name you created (e.g., `my-notes`)
4. Click "Initialize from GitHub"
5. Wait for clone to complete

### Using Git Sync

#### Push Changes

**Method 1: Use Shortcut**
- Press `Cmd+Shift+P`
- App automatically commits and pushes all changes

**Method 2: Use Git Button**
1. Click 🔄 Git button at bottom left
2. Select "Push"
3. Wait for push to complete

**Method 3: Use Status Indicator**
1. Top shows unpushed changes count
2. Click status indicator
3. Auto-push

#### Pull Updates

1. Click 🔄 Git button at bottom left
2. Select "Pull"
3. Wait for pull to complete
4. File tree refreshes automatically

#### Git Status Explanation

**Top Status Indicator**
- 🟡 Yellow + number: Unpushed changes
- 🔵 Blue: Checking status
- ⚪ Gray: No changes

**Bottom Status Bar**
- "Pushing...": Pushing to GitHub
- "Push Successful": Push complete
- "Pulling...": Pulling from GitHub
- "Pull Successful": Pull complete

### Auto Sync

- Auto-pull latest changes when switching to remote notebook
- Git status updates automatically after saving note
- Each push automatically commits all changes

### Multi-Device Sync

1. Edit notes on Device A and push
2. Open app on Device B
3. Switch to remote notebook (auto-pull)
4. Or manually click "Pull" button
5. Get latest note content

### Conflict Handling

If editing same note on multiple devices simultaneously:

1. App will prompt about conflict
2. Recommendation:
   - Complete editing on one device then push
   - Pull on other device before editing
3. May need to manually resolve Git conflicts

---

## Version History

### View Version History

1. Open a note
2. Click 🕐 history button in top toolbar
3. Version history panel slides out on right

### History Record Information

Each history record shows:
- 📅 Commit time
- 👤 Committer (usually your GitHub username)
- 💬 Commit message (auto-generated)
- #️⃣ Commit hash (first 7 characters)

### Preview Historical Version

1. Click "Preview" button in history record
2. Dialog shows that version's content
3. Displayed in read-only mode
4. Can view note content at that time

### Restore Historical Version

1. Click "Restore" button in history record
2. Confirm restore operation
3. Current note content replaced with historical version
4. Editor updates display automatically

**Note**:
- Restore overwrites current content
- Recommend preview and confirm before restoring
- Restore creates new commit record

### Version History Limitations

- Shows only last 50 commits
- Only remote notebooks (Git repositories) have version history
- Local notebooks don't support version history

---

## Advanced Features

### Notebook Management

#### Create New Notebook

1. Click ⚙️ settings button at bottom left
2. Under "Global Settings" tab
3. Click "Initialize Default Notebook"
4. Creates new notebook at default path

#### Switch Notebooks

1. Open settings
2. Select from "Current Notebook" dropdown
3. Choose notebook to switch to
4. Click "OK" to save

#### Notebook Types

**Local Notebook**
- Stored on local disk
- No Git sync support
- No version history support
- Good for private content

**Remote Notebook**
- Connected to GitHub repository
- Supports Git sync
- Supports version history
- Good for multi-device sync

### Change Storage Path

1. Open settings
2. Click "Change Default Path" in "Local Path" field
3. Select new folder
4. App moves notes to new location

### Edit Raw JSON

**⚠️ Advanced feature, use with caution**

1. Click 📄 button in top left
2. Opens raw JSON editor
3. Can directly edit note's JSON data
4. Save to update editor display

**Usage**:
- Batch modify data
- Debug editor issues
- Import/export special formats

**Risks**:
- Incorrect JSON format prevents note from opening
- Recommend backing up notes first

### Developer Tools

1. Click 🖥️ button in top left
2. Opens Chrome DevTools
3. Can view console logs
4. Debug app issues

---

## FAQ

### Installation & Startup

**Q: Double-clicking app shows "Damaged, cannot be opened"?**

A: This is macOS security mechanism. Solution:
```bash
xattr -cr /Applications/YesnoteLite.app
```
Then reopen the app.

**Q: App won't start?**

A: Check:
1. macOS version ≥ 10.12
2. Downloaded correct chip version (Intel/Apple Silicon)
3. Try re-downloading installer

### Note Management

**Q: Where are notes saved?**

A: Default path is `~/YesnoteLite/repos/default/`
In Finder, press `Cmd+Shift+G` and enter path to access.

**Q: How to backup notes?**

A: Three methods:
1. Copy entire `~/YesnoteLite` folder
2. Use Git sync to GitHub
3. Use Time Machine backup

**Q: Can I import Markdown files?**

A: Current version doesn't support direct import. Recommendation:
1. Manually copy-paste content
2. Or place .md files in notebook folder

**Q: Can deleted notes be recovered?**

A:
- If using Git sync: Can recover through version history
- If local notebook: Cannot recover, delete with caution

### Git Sync

**Q: Push failed, what to do?**

A: Check:
1. Network connection is normal
2. GitHub Token is valid
3. Repository permissions are correct
4. View error message in bottom status bar

**Q: How to view GitHub Token?**

A: Token shown only once when created. If forgotten:
1. Delete old Token on GitHub
2. Create new Token
3. Reconfigure in app

**Q: Can I sync to GitLab or other platforms?**

A: Current version only supports GitHub.

**Q: How much bandwidth does sync use?**

A: Notes are plain text, very small bandwidth:
- A 1000-word note is about 5-10 KB
- Images use more bandwidth

### Editor

**Q: Toolbar + button not showing?**

A: This is usually because:
1. Editor is loading, wait a moment
2. Try refreshing app (`Cmd+R`)
3. Restart app

**Q: How to insert images?**

A: Current version doesn't support image insertion. Planned for future version.

**Q: Does it support Markdown syntax?**

A: Partial support:
- Starting with `#` auto-converts to header
- Starting with `-` or `*` auto-converts to list
- Other Markdown syntax requires manual block type selection

**Q: How to export as PDF or other formats?**

A: Current version doesn't support export. Recommendation:
1. Copy content to other app (like Pages)
2. Use other tools to export
3. Or directly use Markdown files on GitHub

### Performance

**Q: App running slow?**

A: Optimization suggestions:
1. Reduce note count in single notebook (recommend < 1000)
2. Regularly clean up unneeded notes
3. Close unused features (like auto-save)
4. Restart app

**Q: Search is slow?**

A:
1. Search scans all note content
2. More notes = slower search
3. Recommend using file tree filter feature

---

## Tips & Best Practices

### Organizing Notes

#### Recommended Folder Structure

```
📁 Work
  📁 Project A
    📁 Requirements
    📁 Design
    📁 Development
  📁 Project B
  📁 Meeting Notes

📁 Learning
  📁 Programming
    📁 JavaScript
    📁 Python
  📁 Design
  📁 Book Notes

📁 Personal
  📁 Journal
  📁 Ideas
  📁 To-Do
```

#### Naming Conventions

**Folder Naming**
- Use short, descriptive names
- Avoid special characters
- Can use Chinese or English

**Note Naming**
- Format: `Date-Topic`, e.g., `2024-02-14-Project Requirements`
- Or: `Topic-Version`, e.g., `API Docs-v2`
- Keep consistent naming style

### Efficient Workflow

#### Quick Capture

1. Use pin feature to fix "Quick Capture" note
2. Open anytime to record ideas
3. Regularly organize to corresponding folders

#### Project Management

1. Create separate folder for each project
2. Use checklist to track tasks
3. Name meeting notes with dates
4. Add favorites to important documents

#### Knowledge Management

1. Categorize by topic (not too detailed)
2. Use headers to organize note structure
3. Add links between related notes
4. Regularly review and update

### Backup Strategy

#### Triple Backup

1. **Local Backup**: Regularly copy YesnoteLite folder
2. **Cloud Backup**: Use GitHub sync
3. **Time Machine**: Use macOS Time Machine

#### Backup Frequency

- Important projects: Daily backup
- General notes: Weekly backup
- Archived content: Monthly backup

### Multi-Device Collaboration

#### Sync Process

**Device A (Primary)**
1. Edit notes
2. Save (automatic)
3. Push to GitHub (`Cmd+Shift+P`)

**Device B (Secondary)**
1. Open app
2. Pull updates (automatic or manual)
3. View/edit notes
4. Push changes

#### Avoid Conflicts

- Complete editing on one device before switching
- Push before switching devices
- Pull before starting work

### Search Tips

#### Effective Search

- Use keywords rather than complete sentences
- Try different keyword combinations
- Use file tree filter to narrow scope

#### Tag System

Although no built-in tag feature, can use:
- Add tags in note title: `[Project] Requirements Doc`
- Add tag line at note beginning: `#project #requirements`
- Search tags to quickly locate

### Improve Efficiency

#### Master Keyboard Shortcuts

- Remember common shortcuts (`Cmd+S`, `Cmd+Shift+P`, `Cmd+?`)
- Reduce mouse usage
- Increase editing speed

#### Custom Workflow

1. Create note templates (in pinned notes)
2. Copy template to create new notes
3. Keep consistent note format

#### Regular Maintenance

- Weekly clean up unneeded notes
- Organize folder structure
- Update important notes
- Check Git sync status

---

## Changelog

### v0.1.0 (2024-02-14)

**New Features**
- ✨ Breadcrumb navigation
- ✨ Auto-save (30 seconds)
- ✨ Save status indicator
- ✨ Real-time Git status display
- ✨ Version history viewer
- ✨ Keyboard shortcuts help (Cmd+?)
- ✨ Keyboard shortcut support (Cmd+Shift+P push)
- ✨ Favorite and pin features
- ✨ Full-text search

**Improvements**
- 🎨 Optimized interface layout and spacing
- 🎨 Editor width increased to 1000px
- 🎨 Default window width 1300px
- ⚡ File scan performance optimization
- ⚡ Git status check optimization

**Fixes**
- 🐛 Fixed Git status not updating after push
- 🐛 Fixed editor toolbar display issue
- 🐛 Fixed empty note rendering error

---

## Getting Help

### In-App Help

- Press `Cmd+?` to view keyboard shortcuts help
- Read this document for detailed features

### Report Issues

If you encounter problems or have feature suggestions:

1. Check "FAQ" section of this document
2. Submit Issue on GitHub repository
3. Provide detailed problem description and screenshots

### Community

- GitHub: [Project URL]
- Documentation: This file
- Updates: Check GitHub Releases

---

## Appendix

### File Format

Notes are stored in JSON format:

```json
{
  "time": 1676390400000,
  "blocks": [
    {
      "type": "header",
      "data": {
        "text": "Title",
        "level": 1
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Paragraph content"
      }
    }
  ],
  "version": "2.26.5"
}
```

### System Files

- **Config File**: `~/Library/Application Support/YesnoteLite/config.json`
- **Note Files**: `~/YesnoteLite/repos/[notebook-name]/`
- **Log Files**: `~/Library/Logs/YesnoteLite/`

### Privacy & Security

- All data stored locally
- Git sync uses HTTPS encryption
- GitHub Token stored in local config file
- Recommend using private repository for notes

---

**Version**: v0.1.0
**Updated**: 2024-02-14
**System**: macOS 10.12+

Thank you for using YesnoteLite! 🎉
