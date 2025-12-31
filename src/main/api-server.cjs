const { serveNcmApi } = require('NeteaseCloudMusicApi/server.js')

serveNcmApi({
  port: 3000,
  host: '127.0.0.1'
})
  .then(() => {
    console.log('NeteaseCloudMusicApi server started on http://127.0.0.1:3000')
  })
  .catch((err) => {
    console.error('Failed to start API server:', err)
  })
