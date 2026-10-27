module.exports = {
  css: {
    loaderOptions: {
      sass: {
        data: `@import "@/styles/styles.scss";`,
      },
    },
  },
  transpileDependencies: [
    '@mediapipe/tasks-vision',
    'three'
  ],
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto'
        }
      ]
    }
  }
}
