# YesnoteLite v0.1.0 安装指南

## 🎉 欢迎使用 YesnoteLite！

这是一个简洁高效的笔记应用，支持 Markdown 编辑、Git 同步等功能。

---

## 📦 下载安装包

构建文件位于: `release/0.1.0/`

### macOS 用户

根据你的 Mac 芯片选择对应的安装包：

#### Apple Silicon (M1/M2/M3 芯片)
```
YesnoteLite-0.1.0-arm64.dmg (100 MB)
```

#### Intel 芯片
```
YesnoteLite-0.1.0-x64.dmg (104 MB)
```

**如何查看你的芯片类型？**
1. 点击左上角苹果图标  → 关于本机
2. 查看"芯片"或"处理器"信息
   - 如果显示 "Apple M1/M2/M3"，选择 arm64 版本
   - 如果显示 "Intel"，选择 x64 版本

---

## 🚀 安装步骤

### macOS 安装

1. **打开 DMG 文件**
   - 双击下载的 `.dmg` 文件

2. **拖拽安装**
   - 将 `YesnoteLite` 图标拖到 `Applications` 文件夹

3. **首次运行**
   - 打开 `Applications` 文件夹
   - 找到并双击 `YesnoteLite`
   - 如果看到"无法打开"的提示：
     - 打开 `系统偏好设置` → `安全性与隐私`
     - 点击"仍要打开"按钮
     - 或者在终端运行: `xattr -cr /Applications/YesnoteLite.app`

4. **开始使用**
   - 应用会在 `~/YesnoteLite` 创建默认笔记本
   - 开始创建你的第一个笔记！

---

## ⌨️ 快捷键

按 `Cmd + ?` 查看所有快捷键

### 常用快捷键
- `Cmd + S` - 保存笔记
- `Cmd + Shift + P` - Git 推送
- `Cmd + B` - 粗体
- `Cmd + I` - 斜体
- `Cmd + K` - 插入链接

---

## 🔧 配置 Git 同步（可选）

如果你想使用 Git 同步功能：

1. 点击左侧设置按钮 ⚙️
2. 切换到"远程设置"标签
3. 填写 GitHub 信息：
   - GitHub 用户名
   - GitHub Token (在 GitHub.com → Settings → Developer settings → Personal access tokens 创建)
   - 仓库名称
4. 点击"从 GitHub 初始化"

---

## 📝 新功能亮点

### v0.1.0 新增功能

✨ **保存状态指示器** - 实时显示保存状态
⏰ **自动保存** - 每30秒自动保存
⌨️ **快捷键帮助** - 按 Cmd+? 查看
📍 **面包屑导航** - 清晰显示文件路径
🚀 **性能优化** - 更快的文件操作
🎨 **界面改进** - 更统一美观的界面

详见 `RELEASE_NOTES_v0.1.0.md`

---

## ❓ 常见问题

### Q: 无法打开应用，提示"已损坏"？
A: 这是因为应用未签名。在终端运行：
```bash
xattr -cr /Applications/YesnoteLite.app
```

### Q: 笔记保存在哪里？
A: 默认保存在 `~/YesnoteLite/repos/default/`

### Q: 如何备份笔记？
A:
1. 直接复制 `~/YesnoteLite` 文件夹
2. 或使用 Git 同步到 GitHub

### Q: 支持 iCloud 同步吗？
A: 暂不直接支持，但可以：
1. 将笔记文件夹移到 iCloud Drive
2. 或使用 Git 同步功能

### Q: 如何卸载？
A:
1. 删除 `/Applications/YesnoteLite.app`
2. 删除 `~/YesnoteLite` (如果不需要保留笔记)

---

## 🐛 问题反馈

如果遇到问题，请提供以下信息：
- macOS 版本
- 芯片类型 (Intel/Apple Silicon)
- 问题描述和截图

---

## 📄 许可证

MIT License

---

**版本**: 0.1.0
**构建日期**: 2026-02-13
**支持系统**: macOS 10.12+
