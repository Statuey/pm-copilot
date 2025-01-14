// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// API密钥和工作流ID
const COZE_API_KEY = process.env.coze_api_key; // 从环境变量中获取
const WORKFLOW_ID = process.env.workflow_id; // 从环境变量中获取

// 下载图片并上传到云存储
async function downloadAndUpload(url) {
  try {
    // 下载图片
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer'
    });

    // 生成唯一的文件名
    const fileName = 'mermaid_' + Date.now() + '.png';

    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: response.data,
    });

    // 获取文件的临时链接
    const tempUrl = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID],
    });

    return tempUrl.fileList[0].tempFileURL;
  } catch (error) {
    console.error('下载或上传图片失败：', error);
    throw error;
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { text, imageUrl } = event;
    
    // 根据输入类型准备不同的参数
    const parameters = imageUrl 
      ? { img: imageUrl }   // 图片模式
      : { desc: text };     // 文本模式
    console.log('请求参数：', parameters); // 添加日志

    // 调用API生成流程图
    const response = await axios({
      method: 'post',
      url: 'https://api.coze.cn/v1/workflow/run',
      headers: {
        'Authorization': `Bearer ${COZE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        workflow_id: WORKFLOW_ID,
        parameters
      },
      timeout: 19000 // 设置19秒超时，留1秒缓冲时间
    });

    console.log('API响应：', response.data); // 添加日志

    // 检查API响应
    if (response.data.code === 0 && response.data.data) {
      // 解析返回的数据
      const result = JSON.parse(response.data.data);
      
      // 提取mermaid代码，确保格式正确
      let mermaidCode = result.output.replace(/^```mermaid\n/, '').replace(/\n```$/, '');
      
      // 确保代码是干净的，移除多余的空行和空格
      mermaidCode = mermaidCode.trim();
      
      // 生成预览图的URL
      const jsonForMermaid = {
        code: mermaidCode,
        mermaid: {
          theme: 'default'
        }
      };
      
      // 使用更安全的编码方式
      const base64Diagram = Buffer.from(JSON.stringify(jsonForMermaid)).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const mermaidUrl = `https://mermaid.ink/img/${base64Diagram}`;
      
      console.log('生成的Mermaid代码：', mermaidCode); // 添加日志
      console.log('生成的图片URL：', mermaidUrl); // 添加日志
      
      // 下载图片并上传到云存储
      const cloudImageUrl = await downloadAndUpload(mermaidUrl);
      
      return {
        success: true,
        mermaidCode: mermaidCode,
        imageUrl: cloudImageUrl
      };
    } else {
      throw new Error(response.data.message || 'API返回错误');
    }
  } catch (error) {
    console.error('生成失败：', error);
    return {
      success: false,
      error: error.message || '生成失败'
    };
  }
} 