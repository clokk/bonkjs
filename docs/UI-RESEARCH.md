# UI Primitives Research

Research into UI systems from Godot, Unity, and Phaser to inform Bonk Engine's UI design.

---

## Godot Control Nodes

Godot has a comprehensive hierarchy where all UI elements inherit from `Control`. The system uses anchors and containers for responsive layouts.

**Sources:** [Control Node Gallery](https://docs.godotengine.org/en/stable/tutorials/ui/control_node_gallery.html), [Control Class](https://docs.godotengine.org/en/stable/classes/class_control.html)

### Text & Display
| Node | Description |
|------|-------------|
| `Label` | Display-only text (single/multi-line) |
| `RichTextLabel` | Text with BBCode formatting (bold, italic, colors, images) |
| `TextureRect` | Display images/textures with scaling modes |
| `NinePatchRect` | Stretchable bordered textures (panels, buttons) |
| `ColorRect` | Solid color rectangle |
| `VideoStreamPlayer` | Video playback |

### Text Input
| Node | Description |
|------|-------------|
| `LineEdit` | Single-line text input |
| `TextEdit` | Multi-line text editor |
| `CodeEdit` | Code editor with syntax highlighting |
| `SpinBox` | Numeric input with increment/decrement buttons |

### Buttons
| Node | Description |
|------|-------------|
| `Button` | Standard clickable button with text |
| `TextureButton` | Button with image states (normal, hover, pressed) |
| `CheckBox` | Toggle with checkmark indicator |
| `CheckButton` | Toggle styled as on/off switch |
| `OptionButton` | Dropdown selection (like HTML `<select>`) |
| `MenuButton` | Button that opens a popup menu |
| `LinkButton` | Hyperlink-styled button |

### Sliders & Ranges
| Node | Description |
|------|-------------|
| `HSlider` / `VSlider` | Horizontal/vertical slider |
| `HScrollBar` / `VScrollBar` | Scrollbar controls |
| `ProgressBar` | Visual progress indicator |
| `TextureProgressBar` | Progress bar with custom textures |

### Containers (Layout)
| Node | Description |
|------|-------------|
| `HBoxContainer` / `VBoxContainer` | Horizontal/vertical stacking |
| `GridContainer` | Grid layout |
| `FlowContainer` | Wrapping flow layout |
| `MarginContainer` | Adds padding/margins |
| `CenterContainer` | Centers child |
| `AspectRatioContainer` | Maintains aspect ratio |
| `ScrollContainer` | Scrollable area |
| `SplitContainer` | Resizable split panes |
| `TabContainer` | Tabbed interface |
| `PanelContainer` | Styled background panel |

### Complex Controls
| Node | Description |
|------|-------------|
| `ItemList` | Selectable list of items |
| `Tree` | Hierarchical tree view |
| `GraphEdit` | Node graph editor |
| `TabBar` | Tab strip without content |
| `MenuBar` | Application menu bar |

### Popups
| Node | Description |
|------|-------------|
| `PopupMenu` | Context menu |
| `PopupPanel` | Generic popup container |
| `FileDialog` | File browser dialog |
| `ColorPicker` / `ColorPickerButton` | Color selection |

---

## Unity UI Toolkit

Unity's modern UI system uses web-inspired patterns: UXML (structure), USS (styling), C# (logic). Layout uses Flexbox (via Yoga engine).

**Sources:** [UI Toolkit Manual](https://docs.unity3d.com/Manual/UIElements.html), [Visual Elements](https://docs.unity3d.com/Manual/UIE-VisualTree.html), [Controls Reference](https://docs.unity3d.com/6000.3/Documentation/Manual/UIE-Controls.html)

### Core Concepts
- **VisualElement** - Base class for all UI elements (like Godot's Control)
- **Visual Tree** - Hierarchy of elements (parent-child relationships)
- **USS** - Styling language similar to CSS
- **UXML** - Markup language similar to HTML

### Text & Display
| Element | Description |
|---------|-------------|
| `Label` | Text display |
| `Image` | Display textures/sprites |
| `VisualElement` | Generic container (can have background) |

### Text Input
| Element | Description |
|---------|-------------|
| `TextField` | Single-line text input |
| `IntegerField` / `FloatField` | Numeric input with validation |
| `Vector2Field` / `Vector3Field` | Multi-component numeric input |

### Buttons & Toggles
| Element | Description |
|---------|-------------|
| `Button` | Clickable button |
| `Toggle` | Checkbox-style toggle |
| `ToggleButtonGroup` | Group of exclusive toggles |
| `RadioButton` / `RadioButtonGroup` | Radio button selection |

### Selection
| Element | Description |
|---------|-------------|
| `DropdownField` | Dropdown selection |
| `EnumField` | Dropdown for enum values |
| `PopupField` | Generic popup selection |

### Sliders & Ranges
| Element | Description |
|---------|-------------|
| `Slider` / `SliderInt` | Value slider |
| `MinMaxSlider` | Range slider (two handles) |
| `Scroller` | Scrollbar control |
| `ProgressBar` | Progress indicator |

### Containers & Layout
| Element | Description |
|---------|-------------|
| `VisualElement` | Flexbox container |
| `ScrollView` | Scrollable area |
| `Foldout` | Collapsible section |
| `GroupBox` | Labeled group |
| `TwoPaneSplitView` | Resizable split panes |
| `TabView` | Tabbed interface |

### Lists & Trees
| Element | Description |
|---------|-------------|
| `ListView` | Virtualized list (efficient for many items) |
| `TreeView` | Hierarchical tree |
| `MultiColumnListView` | Table-style list |

---

## Phaser 3

Phaser doesn't have built-in UI components - it treats everything as game objects. The community uses plugins like [Rex UI](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-overview/) for comprehensive UI.

**Sources:** [Phaser UI Components](https://phaser.io/news/2019/04/phaser-3-ui-components), [Rex UI Overview](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-overview/)

### Built-in Primitives
| Object | Description |
|--------|-------------|
| `Text` | Basic text rendering |
| `BitmapText` | Pre-rendered font text (faster) |
| `Graphics` | Vector drawing (shapes, lines) |
| `Image` / `Sprite` | Texture display |
| `Container` | Group objects together |
| `Zone` | Invisible interactive area |

### Rex UI Plugin (46+ components)
The most popular UI plugin for Phaser 3.

**Layout:**
- `Sizer`, `GridSizer`, `FixWidthSizer`, `OverlapSizer`
- `Anchor`, `GridAlign`

**Text:**
- `BBCodeText` - Rich text with formatting
- `TagText` - Custom tag-based text
- `TextArea` - Multi-line input
- `InputText` - Single-line input (uses DOM)

**Buttons & Interactive:**
- `Buttons`, `GridButtons`, `FixWidthButtons`
- `Label` - Icon + text + background
- `Click`, `Tap`, `Press` behaviors

**Dialogs & Menus:**
- `Dialog` - Title, content, buttons, background
- `ConfirmDialog`, `NameInputDialog`
- `Menu`, `DropDownList`
- `Tabs`, `Pages`
- `Toast`, `ToastQueue`

**Sliders & Progress:**
- `Slider`, `NumberBar`, `Knob`
- `CircularProgress`, `LineProgress`
- `ScrollablePanel`

**Specialized:**
- `NinePatch`, `RoundRectangle`
- `ColorInput`, `ColorPicker`
- `FileChooser`, `FileDropZone`

---

## Comparison Matrix

| Feature | Godot | Unity UI Toolkit | Phaser (Rex UI) |
|---------|-------|------------------|-----------------|
| **Architecture** | Node hierarchy | Visual tree + Flexbox | Game objects + plugin |
| **Styling** | Themes + StyleBox | USS (CSS-like) | Inline config |
| **Layout** | Anchors + Containers | Flexbox | Sizers |
| **Text Rendering** | Built-in + BBCode | Built-in | Multiple options |
| **Responsive** | Anchors, margins | Flex properties | Manual |

---

## Recommended Primitives for Bonk Engine

Based on this research, here's a prioritized list of UI primitives:

### Tier 1: Essential (MVP)
These cover 80% of game UI needs:

| Component | Description | Priority |
|-----------|-------------|----------|
| `Text` | Display text with basic styling | Must have |
| `Label` | Text + optional icon + background | Must have |
| `Button` | Interactive with hover/press states | Must have |
| `Image` | Display textures | Must have |
| `Panel` | Container with background | Must have |
| `VBox` / `HBox` | Vertical/horizontal layout | Must have |

### Tier 2: Common Controls
For more complete UI:

| Component | Description | Priority |
|-----------|-------------|----------|
| `ProgressBar` | Health bars, loading | High |
| `Slider` | Volume, settings | High |
| `Toggle` / `Checkbox` | On/off options | High |
| `TextInput` | Name entry, chat | Medium |
| `ScrollView` | Scrollable content | Medium |
| `NinePatch` | Stretchable panels | Medium |

### Tier 3: Advanced
For complex UIs:

| Component | Description | Priority |
|-----------|-------------|----------|
| `Dropdown` | Selection menus | Medium |
| `List` | Item selection | Medium |
| `Dialog` | Modal dialogs | Medium |
| `Tabs` | Tabbed interfaces | Low |
| `Grid` | Grid layout | Low |

---

## Design Principles

Based on the research:

1. **Composition over inheritance** - Build complex controls from simpler ones (Label = Text + Image + Panel)

2. **Flexbox-inspired layout** - Unity's approach is modern and familiar to web developers

3. **Separation of structure and style** - Like Unity's UXML/USS split, keep layout and appearance separate

4. **Scene-native** - Define UI in the same JSON format as scenes:
   ```json
   {
     "type": "UI",
     "children": [{
       "type": "Panel",
       "anchor": "top-right",
       "padding": 10,
       "children": [{
         "type": "HBox",
         "gap": 5,
         "children": [
           { "type": "Image", "src": "./ui/heart.png" },
           { "type": "Text", "style": "health", "text": "{health}" }
         ]
       }]
     }]
   }
   ```

5. **Game-first, not app-first** - Optimize for common game UI patterns (HUD, menus, dialogs) rather than complex app interfaces

---

## Next Steps

1. Design the base `UIElement` class (like Godot's Control / Unity's VisualElement)
2. Implement layout system (anchors + flexbox-style containers)
3. Build Tier 1 primitives
4. Add theming/styling system
5. Create UI examples and documentation
