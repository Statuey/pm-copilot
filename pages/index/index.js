// index.js
Page({
  data: {
    inputText: '',
    mermaidCode: '',
    imageUrl: '',
    loading: false
  },

  // 输入文本变化处理
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
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

      if (result.result && result.result.success) {
        this.setData({
          mermaidCode: result.result.mermaidCode,
          imageUrl: result.result.imageUrl
        });
      } else {
        throw new Error(result.result.error || '生成失败');
      }
    } catch (error) {
      console.error('生成失败：', error);
      wx.showToast({
        title: error.message || '生成失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
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