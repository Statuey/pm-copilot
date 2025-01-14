// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// API密钥和工作流ID
const COZE_API_KEY = cloud.getWXContext().COZE_API_KEY; // 替换为你的实际API密钥
const WORKFLOW_ID = cloud.getWXContext().WORKFLOW_ID; // 替换为你的实际工作流ID

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
      
      // 使用encodeURIComponent确保URL安全
      const base64Diagram = Buffer.from(JSON.stringify(jsonForMermaid)).toString('base64');
      const imageUrl = `https://mermaid.ink/img/${encodeURIComponent(base64Diagram)}`;
      
      console.log('生成的Mermaid代码：', mermaidCode); // 添加日志
      console.log('生成的图片URL：', imageUrl); // 添加日志
      
      return {
        success: true,
        mermaidCode: mermaidCode,
        imageUrl: imageUrl
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