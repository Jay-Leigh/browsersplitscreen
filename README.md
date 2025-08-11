# Split Screen Extension

A Chrome extension that enables Microsoft Edge-style split screen functionality for enhanced multitasking and productivity.

## Features

- **Dual Pane View**: Split any tab into two independent browsable panes
- **Flexible Layout**: Switch between horizontal and vertical split orientations
- **Resizable Divider**: Drag to adjust pane sizes dynamically
- **Independent Navigation**: Each pane maintains separate browsing history
- **Keyboard Shortcuts**: Quick access via hotkeys
- **Tab Integration**: Seamless Chrome tab management

## Use Cases

### Productivity & Work
- **Research & Documentation**: Compare sources while writing reports
- **Code Review**: View documentation alongside implementation
- **Data Analysis**: Monitor dashboards while accessing analytical tools
- **Translation Work**: Source and target content side-by-side

### Development
- **Frontend Development**: Preview changes while editing code
- **API Testing**: Documentation and testing interface together
- **Cross-Browser Testing**: Compare implementations across different views
- **Learning**: Tutorial content with hands-on practice environment

### Content Creation
- **Social Media Management**: Monitor feeds while creating content
- **Video Production**: Reference material alongside editing interface
- **Writing**: Research sources with document editor
- **Design**: Inspiration gallery with design tools

### General Browsing
- **Shopping**: Compare products and prices efficiently
- **Entertainment**: Chat/social media while streaming content
- **Email Management**: Calendar and email interface together
- **News Consumption**: Multiple sources for comprehensive coverage

## Installation

1. Clone repository: `git clone https://github.com/yourusername/split-screen-extension.git`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. Pin the extension to your toolbar for easy access

## Usage

### Basic Operation
1. Click the extension icon in your toolbar
2. Click "Enable Split Screen" on current tab
3. Enter URL for second pane or select from recent tabs
4. Use the resize handle to adjust pane proportions

### Keyboard Shortcuts
- `Ctrl+Shift+S`: Toggle split screen mode
- `Ctrl+Shift+H`: Switch to horizontal layout
- `Ctrl+Shift+V`: Switch to vertical layout
- `Ctrl+Shift+R`: Reset pane sizes to 50/50

## File Structure

```
split-screen-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for extension lifecycle
├── content.js            # Content script for tab manipulation
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── styles.css           # UI styling
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `activeTab`, `storage`, `tabs`
- **Browser Compatibility**: Chrome 88+, Edge 88+
- **Architecture**: Service Worker + Content Script pattern

## Configuration

Access options through the popup interface:
- Default split orientation (horizontal/vertical)
- Default pane ratio
- Keyboard shortcuts customization
- Auto-save split configurations

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## Performance Optimization

- Lazy loading for inactive panes
- Memory management for multiple instances
- Efficient DOM manipulation
- Minimal resource overhead

## Browser Support

- Chrome 88+
- Microsoft Edge 88+
- Chromium-based browsers

## License

MIT License - see LICENSE file for details

## Changelog

### v1.0.0
- Initial release
- Basic split screen functionality
- Horizontal and vertical layouts
- Resizable panes
- Keyboard shortcuts

## Support

For issues and feature requests, please use the GitHub issue tracker.
