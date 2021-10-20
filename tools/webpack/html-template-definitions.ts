import { Options as HtmlWebpackPluginOptions } from 'html-webpack-plugin'

export default interface HtmlTemplateDefinitions extends HtmlWebpackPluginOptions {
  lang?: string
  base?: string
  manifest?: string
}
