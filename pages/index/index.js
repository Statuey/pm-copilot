// index.js
Page({
  data: {
    inputText: '',
    mermaidCode: '',
    imageUrl: '',
    loading: false
  },
  // 分享功能
  onShareAppMessage() {
    return {
      title: '流程图生成助手 - 文字转流程图',
      path: '/pages/index/index',
      imageUrl: this.data.imageUrl || ''
    }
  },
  // 输入文本变化处理
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },
  // 校验 mermaid 代码格式
  validateMermaidCode(code) {
    if (!code || typeof code !== 'string') return false;
    
    // 检查是否包含基本的流程图关键字
    const validKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram'];
    const hasValidStart = validKeywords.some(keyword => code.trim().toLowerCase().startsWith(keyword));
    
    // 检查是否包含基本的节点和连接符
    const hasNodes = /[A-Za-z0-9_]+/.test(code);
    const hasConnectors = /[->]/.test(code);
    
    return hasValidStart && hasNodes && hasConnectors;
  },
  // 生成流程图
  async generateFlowchart() {
    const text = this.data.inputText.trim();
    if (!text) {
      wx.showToast({
        title: '请输入描述文本',
        icon: 'none'
      });
      return;
    }
    this.setData({ loading: true });
    try {
      const result = await wx.cloud.callFunction({
        name: 'generateMermaid',
        data: { text },
        config: {
          timeout: 20000 // 设置20秒超时
        }
      });

      console.log('API返回结果：', result);
      
      // 检查接口返回的错误信息
      if (!result || !result.result) {
        this.setData({ 
          loading: false,
          mermaidCode: '',
          imageUrl: ''
        });
        wx.showModal({
          title: '提示',
          content: '生成失败，服务暂时不可用，请稍后再试',
          showCancel: false
        });
        return;
      }
      
      // 处理 HTTP 400 错误
      if (result.result.error && result.result.error.includes('status code 400')) {
        this.setData({ 
          loading: false,
          mermaidCode: '',
          imageUrl: ''
        });
        wx.showModal({
          title: '提示',
          content: '输入的文本可能不够清晰或完整，请尝试更详细的描述',
          showCancel: false
        });
        return;
      }
      
      // 处理其他错误
      if (result.result.error) {
        this.setData({ 
          loading: false,
          mermaidCode: '',
          imageUrl: ''
        });
        wx.showModal({
          title: '提示',
          content: '生成失败，请检查网络后重试',
          showCancel: false
        });
        return;
      }
      
      if (!result.result.success) {
        this.setData({ 
          loading: false,
          mermaidCode: '',
          imageUrl: ''
        });
        wx.showModal({
          title: '提示',
          content: '生成失败，请重新输入后重试',
          showCancel: false
        });
        return;
      }

      // 添加校验
      if (!this.validateMermaidCode(result.result.mermaidCode)) {
        this.setData({ 
          loading: false,
          mermaidCode: '',
          imageUrl: ''
        });
        wx.showModal({
          title: '提示',
          content: '生成的流程图格式不正确，请重新输入更清晰的描述',
          showCancel: false
        });
        return;
      }
      
      this.setData({
        loading: false,
        mermaidCode: result.result.mermaidCode,
        imageUrl: result.result.imageUrl
      });
    } catch (error) {
      console.error('生成失败：', error);
      // 先清空错误数据和重置状态
      this.setData({
        loading: false,
        mermaidCode: '',
        imageUrl: ''
      });
      // 再显示错误提示
      wx.showModal({
        title: '提示',
        content: '生成失败，请检查你的输入是否正确',
        showCancel: false,
        complete: () => {
          console.log('错误提示显示完成');
        }
      });
    }
  },
  // 复制Mermaid代码
  copyCode() {
    if (!this.data.mermaidCode) {
      wx.showToast({
        title: '暂无代码可复制',
        icon: 'none'
      });
      return;
    }
    wx.setClipboardData({
      data: this.data.mermaidCode,
      success: () => {
        wx.showToast({
          title: '代码已复制',
          icon: 'success'
        });
      }
    });
  },
  // 预览图片
  previewImage() {
    if (this.data.imageUrl) {
      wx.previewImage({
        urls: [this.data.imageUrl],
        current: this.data.imageUrl
      });
    }
  },
  // 保存图片
  saveImage() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '图片未生成',
        icon: 'none'
      });
      return;
    }
    wx.downloadFile({
      url: this.data.imageUrl,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: () => {
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
          }
        });
      }
    });
  }
}); 