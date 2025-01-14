Page({
  data: {
    tempImagePath: '',
    mermaidCode: '',
    imageUrl: '',
    loading: false
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

      if (result.result && result.result.success) {
        this.setData({
          mermaidCode: result.result.mermaidCode,
          imageUrl: result.result.imageUrl
        });
      } else {
        throw new Error(result.result.error || '处理失败');
      }
    } catch (error) {
      console.error('处理失败：', error);
      wx.showToast({
        title: '处理失败，请重试',
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