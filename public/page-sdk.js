/**
 * 自定义页面 SDK (page-sdk.js)
 *
 * 为自定义页面提供与主系统通信的能力。
 * 自定义页面通过 <script src="/page-sdk.js"> 引入后，可使用 window.PageSDK 调用以下方法：
 *
 *   PageSDK.getContext()              → { user, config }
 *   PageSDK.getComments(pagePath)     → { comments: [...] }
 *   PageSDK.addComment(pagePath, content, userName?) → { ok, comment }
 *   PageSDK.deleteComment(pagePath, id) → { ok }
 *
 * 所有方法返回 Promise，错误时 reject。
 */
;(function () {
  'use strict'

  var BASE = '/api/page/sdk'

  function request(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    }
    if (body !== undefined) {
      opts.body = JSON.stringify(body)
    }
    return fetch(BASE + path, opts).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || '请求失败 (' + res.status + ')')
          err.status = res.status
          err.data = data
          throw err
        }
        return data
      })
    })
  }

  window.PageSDK = {
    /**
     * 获取当前用户信息和站点配置
     * @returns {Promise<{user: {name, isLoggedIn}, config: {title, description}}>}
     */
    getContext: function () {
      return request('GET', '/context')
    },

    /**
     * 获取指定页面的评论列表
     * @param {string} pagePath - 页面路径，如 "/page/hello-world"
     * @returns {Promise<{comments: Array}>}
     */
    getComments: function (pagePath) {
      return request('GET', '/comments?pagePath=' + encodeURIComponent(pagePath))
    },

    /**
     * 发表评论
     * @param {string} pagePath - 页面路径
     * @param {string} content - 评论内容（最多 2000 字）
     * @param {string} [userName] - 匿名用户显示名（登录用户自动使用真名）
     * @returns {Promise<{ok: boolean, comment: object}>}
     */
    addComment: function (pagePath, content, userName) {
      return request('POST', '/comments', {
        pagePath: pagePath,
        content: content,
        userName: userName || undefined,
      })
    },

    /**
     * 删除评论（仅限自己的评论或管理员）
     * @param {string} pagePath - 页面路径
     * @param {string} id - 评论 ID
     * @returns {Promise<{ok: boolean}>}
     */
    deleteComment: function (pagePath, id) {
      return request('DELETE', '/comments?pagePath=' + encodeURIComponent(pagePath) + '&id=' + encodeURIComponent(id))
    },
  }
})()
