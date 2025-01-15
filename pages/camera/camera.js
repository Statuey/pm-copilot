Page({
  data: {
    tempImagePath: '',
    mermaidCode: '',
    imageUrl: '',
    loading: false
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

  // 分享功能
  onShareAppMessage() {
    return {
      title: '流程图生成助手 - 图片转流程图',
      path: '/pages/camera/camera',
      imageUrl: this.data.imageUrl || this.data.tempImagePath || ''
    }
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });

      this.setData({ 
        tempImagePath: res.tempFiles[0].tempFilePath,
        loading: true 
      });

      // 上传图片到云存储
      const cloudPath = `flowchart/${Date.now()}-${Math.random().toString(36).substr(2)}.png`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: res.tempFiles[0].tempFilePath,
      });

      // 获取图片访问链接
      const { fileList } = await wx.cloud.getTempFileURL({
        fileList: [uploadRes.fileID]
      });

      // 调用云函数处理图片
      const result = await wx.cloud.callFunction({
        name: 'generateMermaid',
        data: {
          imageUrl: fileList[0].tempFileURL
        }
      });

      // 检查接口返回的错误信息
      if (!result || !result.result) {
        this.setData({ 
          loading: false,
          mermaidCode: '',
          imageUrl: ''
        });
        wx.showModal({
          title: '提示',
          content: '图片处理失败，服务暂时不可用，请稍后再试',
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
          content: '无法识别图片中的流程图，请确保图片清晰且包含完整的流程图',
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
          content: '图片处理失败，请检查网络后重试',
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
          content: '图片处理失败，请更换图片后重试',
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
          content: '无法从图片中识别出有效的流程图，请尝试其他图片',
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
      console.error('处理失败：', error);
      // 先清空错误数据和重置状态
      this.setData({
        loading: false,
        mermaidCode: '',
        imageUrl: ''
      });
      // 再显示错误提示
      wx.showModal({
        title: '提示',
        content: '图片处理失败，请检查图片是否包含流程图',
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