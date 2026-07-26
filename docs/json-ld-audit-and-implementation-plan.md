# JSON-LD 構造化データ監査・実装計画

監査日: 2026-07-25<br>
対象: リポジトリ内の `*.html` / `*.htm` 全ファイル<br>
状態: **監査と提案のみ（HTML 未変更・実装未着手）**

## 1. 結論

- HTML は **93 ファイル**（`.html` 92、`.htm` 1）。JSON-LD 実装済みは **2 ページ / 3 ブロック**、未実装は **91 ページ**である。
- Microdata（`itemscope` / `itemtype` / `itemprop`）は **0 ページ**、RDFa（`vocab` / `typeof` 等）は **0 ページ**である。`meta property="og:*"` は OGP であり、RDFa 実装として数えていない。
- 現在の JSON-LD は英日トップの `ResearchProject` と、英語トップだけの独立した `Person` である。トップページそのもの、サイト、ラボの主体を分けていないため、追加ブロックを重ねるのではなく `@graph` へ統合するのが適切である。
- 76 本の徒然小論文は `Article` が適切であり、査読論文・学術出版物であると可視本文から確認できないため、一律の `ScholarlyArticle` は提案しない。ローカル HTML に独立した研究プロジェクト詳細ページもないため、一律の `ResearchProject` も提案しない。
- リダイレクト 3 ページには JSON-LD を追加しない。実装候補は残る **90 ページ**だが、必須度の低い特殊ページまで一括変更せず、段階的に実装する。

## 2. 監査方法と判定基準

全 HTML を列挙し、各ファイルについて次を静的に確認した。

1. `application/ld+json` ブロックと JSON の内容
2. Microdata / RDFa の属性
3. `<html lang>`、`title`、description、canonical、hreflang、OGP
4. 可視 `h1`、著者・ラボ名・研究名称、外部 URL、リダイレクト
5. ファイル名・canonical・本文から判断できる英日対応

Google の「サポート」は schema.org に型が存在することと、Google の検索表示機能の対象であることを分けて判定した。参照基準は [Google Search Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)、[一般ポリシー](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)、[Article](https://developers.google.com/search/docs/appearance/structured-data/article)、[ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page)、[Organization](https://developers.google.com/search/docs/appearance/structured-data/organization)、[Breadcrumb](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) である。schema.org の語彙としては [ResearchProject](https://schema.org/ResearchProject)、[WebSite](https://schema.org/WebSite)、[CollectionPage](https://schema.org/CollectionPage)、[ImageObject](https://schema.org/ImageObject) も参照する。

> 構造化データはリッチリザルトを保証しない。また、Google の専用表示対象外でも、schema.org の意味記述として Google/Bing 等の理解を補助し得る。本計画では両者を混同しない。

## 3. 全体集計

| 項目 | 件数 | 備考 |
|---|---:|---|
| HTML 全体 | 93 | ルート 4、`en/` 3、`jp/` 3、`essays/` 76、`viewer/` 7 |
| JSON-LD 実装済みページ | 2 | `index.html`、`jp/index.html` |
| JSON-LD 未実装ページ | 91 | リダイレクト 3 を含む |
| JSON-LD ブロック | 3 | 英語トップ 2、日本語トップ 1 |
| Microdata | 0 | 検出なし |
| RDFa | 0 | OGP の `property` は除外 |
| description あり | 93 | 全ページ |
| canonical あり | 92 | `zenodo-stats.html` のみなし |
| hreflang あり | 2 | 宇宙居住エッセイの英日ペアだけ |
| OGP `og:title` あり | 4 | 英日トップと英日ギャラリー |
| リダイレクト | 3 | `en/` 配下 |

## 4. 既存構造化データとメタデータの問題

### 4.1 JSON-LD

1. **トップの主型が `ResearchProject` に寄り過ぎている。** トップはサイト入口であり、まず `WebPage` / `WebSite`、運営主体として `Organization` を表すべきである。研究活動を表す場合も、トップそのものと同一視せず別ノードにする。
2. **英語トップの `Person` が重複・分断している。** `ResearchProject.founder` 内の Person と独立 Person は `@id` がなく、検索エンジンには同一人物と確実に結合されない。`@graph` 内の一つの Person を `@id` 参照する。
3. **英日で構造が非対称。** 英語は Person ブロックが別にあるが、日本語は founder 内だけである。日本語側に `publisher` がある一方、英語側にはない。
4. **主体の識別子がない。** Organization、Person、WebSite、WebPage に安定した `@id` がない。実装時は各 canonical を基礎に `#website`、`#organization`、`#person`、`#webpage` 等を使う。
5. **名称が不統一。** 英語では JSON-LD と可視 H1 が “Thought Experiment Lab”、`title` は “Co-Intelligence Lab”。日本語も空白の有無や `title` の「協調知能研究センター」と、依頼で指定された正式名称「松岡×GPT思考実験ラボ」が一致しない。JSON-LD だけで解消せず、実装前に可視名称の採用方針を承認する必要がある。
6. **Person の `url` が不統一。** founder 内は ORCID、独立 Person はサイトトップを `url` としている。人物の主ページを members ページにするなら、その canonical を `url` / `@id` の基礎とし、ORCID、GitHub 等の可視リンクだけを `sameAs` 候補にする。
7. **`affiliation` が名前だけの匿名ノード。** Organization の `@id` 参照へ統合すべきである。
8. **`areaOfFocus` は可視本文と概ね対応するが、自由語の羅列であり、英日差もある。** 本文に明記された範囲だけに制限し、組織または研究活動ノードに置く。トップページを `ResearchProject` とする根拠にはしない。
9. **Google 専用リッチリザルトとの対応が弱い。** `ResearchProject` は Google Search Gallery の専用機能ではない。語彙としての意味はあるが、トップの Organization / WebSite 記述とは別目的である。

### 4.2 title / description / canonical / hreflang / OGP

1. description と `<html lang>` は全 93 ページにある。
2. canonical は 92 ページにある。`zenodo-stats.html` にはなく、JSON-LD より先に canonical の方針を確定する必要がある。
3. hreflang は `is-it-rational-to-live-in-space` の 2 ページだけに相互指定（`en`、`ja`、`x-default`）がある。他の **37 英日エッセイペア**、英日トップ、members、gallery、電磁波 viewer にはない。
4. `en/index.html`、`en/members-en.html`、`en/structure-art-gallery-en.html` は meta refresh と JavaScript のリダイレクトであり、canonical も転送先を指す。この 3 ページは独立言語版として数えず、JSON-LD を置かない。
5. OGP は 89 ページで未実装。ある 4 ページでも、トップの `og:title` は `title` のサイト修飾を省いた表現である。これは必ずしも誤りではないが、JSON-LD の `name` / `headline` は可視 H1 を優先し、OGP と意味が矛盾しないことを個別確認する。
6. `viewer/Structure Art Viewer-Electromagnetic-Waves-jp.html` は日本語ファイル名・日本語 title なのに `lang="en"`、可視 H1 も英語である。現状で `inLanguage: ja` や日本語作品名を推測してはならない。まずページの実態を確認する。
7. `essays/What are emotions-en.html` と `essays/What-are-emotions-jp.html` のように英日で slug 規則が異なる例がある。ファイル名の機械変換ではなく、明示した対応表から `translationOfWork` / `workTranslation`（採用する場合）と hreflang を生成する。
8. canonical には空白を `%20` にした絶対 URL が既に使われている。JSON-LD のページ `@id` / `url` も canonical の文字列表現をそのまま基準にし、相対 URL や別エンコードを混在させない。

## 5. ページ分類と推奨型

| 分類 | ページ数 | 推奨する主型 | 補助ノード | Google 専用表示との関係 |
|---|---:|---|---|---|
| 英日トップ | 2 | `WebPage` | `WebSite`, `Organization`, 表示済み範囲の `Person` | Organization は Google サポート。WebSite はサイト理解用 |
| 英日 members | 2 | `ProfilePage` | `Person`, `Organization` | ProfilePage は Google サポート。ただし AI モデルを Person としない |
| 徒然小論文 | 76 | `Article` | `Person`/`Organization` 参照、`BreadcrumbList` | Article は Google サポート。`ScholarlyArticle` は使用しない |
| 英日 gallery | 2 | `CollectionPage` | 掲載作品の `ImageObject`（可視項目のみ） | 専用リッチリザルト外。意味理解用 |
| Structure Art Viewer | 7 | `WebPage` | 主画像が明確なら `ImageObject`、breadcrumb | WebPage/ImageObject 単独の専用表示を期待しない |
| Zenodo dashboard | 1 | `WebPage` | 必要なら `Dataset` も別途検討（今回の候補外） | 単なる一覧に Article/ResearchProject を付けない |
| リダイレクト | 3 | なし | なし | 追加しない |

### 型を採用しない判断

- **`ScholarlyArticle`: 0 ページ（現時点）**。ローカルの徒然小論文は論文誌・査読・巻号等を表示しておらず、研究的テーマだけでは型の根拠にならない。Zenodo の各成果物は外部レコード側のメタデータに委ねる。
- **`ResearchProject`: 独立主型 0 ページ（現時点）**。トップ内には BFSSU/DMF 等の研究領域・成果一覧があるが、各プロジェクトの固有詳細 URL はない。必要ならトップ `@graph` の補助ノードとして、可視名称・説明・URL が揃うものだけを限定的に表現する。公開前・編集中の `href="#"` 項目を Project や CreativeWork として生成しない。
- **AI システムを `Person` にしない。** members ページ上の GPT / Gemini / Claude / Grok 等は、人間の Person ノードとは分離する。schema.org 上の適切な表現と可視記載が固まるまでは、ProfilePage の `mainEntity` は明記された主宰者・著者に限定する。

## 6. ページ別インベントリ

### 6.1 実装しないページ（3）

| ファイル | 理由 |
|---|---|
| `en/index.html` | `/` へのリダイレクト |
| `en/members-en.html` | `/members.html` へのリダイレクト |
| `en/structure-art-gallery-en.html` | `/structure-art-gallery.html` へのリダイレクト |

### 6.2 優先実装ページ（4）

- `index.html`: 既存 2 ブロックを `@graph` へ統合し、`WebSite`、`Organization`、`WebPage`、Person 参照を整理。
- `jp/index.html`: 既存 1 ブロックを置換・統合し、英語側と対称なグラフにする。ただしページ固有 `@id` は `https://matsuoka-gpt.github.io/jp/…` を基礎にする。
- `members.html`: `ProfilePage` + 可視情報に基づく `Person` + Organization 参照。
- `jp/members.html`: 日本語 ProfilePage。英語ページと同一人物を結ぶ場合でも、ページ (`#webpage`) の `@id` は共有しない。Person のサイト全体識別子を共有するかは名称・主 URL の承認後に決める。

### 6.3 Article 実装ページ（76 = 38 英日ペア）

下表は対応をファイル名の推測ではなく、title / H1 / 内容対応を確認して作成した実装用マッピングである。

| # | 英語 | 日本語 |
|---:|---|---|
| 1 | `Contradictions and Paradoxes-en.html` | `Contradictions and Paradoxes-jp.html` |
| 2 | `Coping_with_addiction-en.html` | `Coping_with_addiction-jp.html` |
| 3 | `Democracy and Metacognition-en.html` | `Democracy and Metacognition-jp.html` |
| 4 | `Freedom is a trade-off-en.html` | `Freedom is a trade-off-jp.html` |
| 5 | `Nuclear weapons and meteorites-en.html` | `Nuclear weapons and meteorites-jp.html` |
| 6 | `What are emotions-en.html` | `What-are-emotions-jp.html` |
| 7 | `age by healthcheck-en.html` | `age by healthcheck-jp.html` |
| 8 | `average-is-a-coarse-metric-en.html` | `average-is-a-coarse-metric-jp.html` |
| 9 | `body-odor-process-en.html` | `body-odor-process-jp.html` |
| 10 | `choice-as-constraint-en.html` | `choice-as-constraint-jp.html` |
| 11 | `civilization-convergence-en.html` | `civilization-convergence-jp.html` |
| 12 | `co-intelligence-story-and-awe-en.html` | `co-intelligence-story-and-awe-jp.html` |
| 13 | `comparison-and-structure-games-en.html` | `comparison-and-structure-games-jp.html` |
| 14 | `concept-architect-no-ideology-en.html` | `concept-architect-no-ideology-jp.html` |
| 15 | `efficiency-paradox-en.html` | `efficiency-paradox-jp.html` |
| 16 | `egg-chicken-and-mood-en.html` | `egg-chicken-and-mood-jp.html` |
| 17 | `four-brains-co-intelligence-en.html` | `four-brains-co-intelligence-jp.html` |
| 18 | `is-it-rational-to-live-in-space-en.html` | `is-it-rational-to-live-in-space-jp.html` |
| 19 | `knowledge_trap_tsurezure-en.html` | `knowledge_trap_tsurezure-jp.html` |
| 20 | `kozo-hitsuzensei-en.html` | `kozo-hitsuzensei-jp.html` |
| 21 | `life-100-percent-en.html` | `life-100-percent-jp.html` |
| 22 | `life-and-death-structure-en.html` | `life-and-death-structure-jp.html` |
| 23 | `mealtime-happiness-en.html` | `mealtime-happiness-jp.html` |
| 24 | `media-outliers-en.html` | `media-outliers-jp.html` |
| 25 | `money_philosophy-en.html` | `money_philosophy-jp.html` |
| 26 | `nai-mono-nedari-structure-en.htm` | `nai-mono-nedari-structure-jp.html` |
| 27 | `pure_self_time-en.html` | `pure_self_time-jp.html` |
| 28 | `pyramid_design_freedom-en.html` | `pyramid_design_freedom-jp.html` |
| 29 | `rationality-and-irrationality-en.html` | `rationality-and-irrationality-jp.html` |
| 30 | `responsibility_overdrive-en.html` | `responsibility_overdrive-jp.html` |
| 31 | `ronpa_culture_deep_thinking-en.html` | `ronpa_culture_deep_thinking-jp.html` |
| 32 | `time-as-index-en.html` | `time-as-index-jp.html` |
| 33 | `value-structure-en.html` | `value-structure-jp.html` |
| 34 | `welcome-en.html` | `welcome-jp.html` |
| 35 | `what-is-chance-and-luck-en.html` | `what-is-chance-and-luck-jp.html` |
| 36 | `what-is-strategy-en.html` | `what-is-strategy-jp.html` |
| 37 | `what-is-understanding-en.html` | `what-is-understanding-jp.html` |
| 38 | `why-diets-fail-en.html` | `why-diets-fail-jp.html` |

全パスの接頭辞は `essays/`。各ページには `Article` を主型として、`headline`（可視 H1）、`description`、`url` / `mainEntityOfPage`（canonical）、`inLanguage`、表示されている場合のみ `datePublished` / `dateModified`、確認できる著者だけを生成する。日付や画像が表示・メタデータに存在しないページには推測で追加しない。

### 6.4 低優先度の実装候補（10）

- `structure-art-gallery.html`, `jp/structure-art-gallery.html`: `CollectionPage`。実際に掲載される作品だけを `hasPart` の `ImageObject` として列挙する。
- `viewer/Structure Art Viewer-Biodiversity.html`
- `viewer/Structure Art Viewer-Electromagnetic-Waves-en.html`
- `viewer/Structure Art Viewer-Electromagnetic-Waves-jp.html`（言語矛盾の解消まで保留）
- `viewer/Structure Art Viewer-Four Brains.html`
- `viewer/Structure Art Viewer-History-Dependent Adaptive Systems.html`
- `viewer/Structure Art Viewer-LVTM.html`
- `viewer/Structure Art Viewer-cosmic-phase.html`
- `zenodo-stats.html`（canonical と index 方針を確定後、`WebPage`）

## 7. 英日対応と `@id` 設計

1. WebPage / Article / CollectionPage は **各 canonical + `#webpage` / `#article`** とし、英日で同じ `@id` を共有しない。
2. WebSite は英語ルートと日本語入口をどう扱うかを決める。推奨はサイト全体の `https://matsuoka-gpt.github.io/#website` を一つ置き、各言語 WebPage の `isPartOf` から参照する方法である。一方、言語別ページ実体は必ず別 `@id` にする。
3. Organization はサイト全体で同一主体と確認できるため一つの安定 ID を候補にできるが、日本語名と英語名は `name` / `alternateName` とし、ページ上の正式表記を先に統一する。
4. Person も実在の同一人物を示す安定 ID を共有できるが、英日 ProfilePage 自体は別 ID にする。ORCID は `sameAs` として、既存 HTML で確認できる URL のみを使う。
5. 英日 Article は別 ID のまま、相互関係を記述する場合は `translationOfWork` / `workTranslation` を用いる。hreflang も全 38 ペアに相互・自己参照で揃える計画とするが、これは JSON-LD 実装と別の HTML メタデータ変更なので、今回の承認範囲外である。

## 8. テンプレート化と個別生成

### 共通テンプレート化できる項目

- `@context`, `@graph` の骨格
- canonical を基礎にした `@id`, `url`, `mainEntityOfPage`
- `isPartOf` の WebSite 参照
- 承認後の Organization / Person の安定 `@id` 参照
- `publisher`, `author` の参照形式（ページに表示される場合だけ）
- `BreadcrumbList` の Home > Essays/Gallery/Viewer > Current page という構造
- HTML `lang` からの `inLanguage`（ただし既知の矛盾ページは例外）

### ページごとに個別生成・確認が必要な項目

- `@type`、`headline` / `name`、description
- 表示される著者、公開日、更新日
- `image` / `ImageObject` の URL、caption、幅・高さ（実データがある場合のみ）
- 英日翻訳対応とページ固有 `@id`
- breadcrumb の名称
- Gallery の `hasPart` と Viewer の主画像
- 研究プロジェクトとして独立ノード化できるか、可視説明と固有 URL があるか
- OGP のタイトル・画像との意味的一致

## 9. 想定変更ファイル数

| 段階 | HTML 変更数 | 累計 | 内容 |
|---|---:|---:|---|
| 1 | 2 | 2 | 英日トップ |
| 2 | 2 | 4 | 英日 members |
| 3 | 76 | 80 | 徒然小論文 Article |
| 4 | 0〜2 | 80〜82 | 独立研究ページがないため、現状はトップ内補助ノードのみ。将来ページができれば別途 |
| 5 | 86 | — | breadcrumb はトップ・リダイレクト・dashboard 等を除き、既実装ページへ同時投入する想定。新規ファイル数ではなく重複変更 |
| 6 | 9〜10 | 89〜90 | gallery 2、viewer 7、dashboard 0〜1 |

最大で **90 HTML ファイル**が候補（リダイレクト 3 を除外）。ただし初回承認後の推奨スコープは段階 1〜2 の **4 ファイル**である。構造化データの生成・検査スクリプトを別途導入する場合は HTML 外に 1〜2 ファイル増える可能性がある。

## 10. 段階的実装計画と優先順位

### P0: 実装前の決定

1. 英語正式名称を依頼指定の “Matsuoka × GPT Co-Intelligence Lab” とし、現在の可視 “Thought Experiment Lab” を alternateName とするかを決める。
2. 日本語名称の空白表記と、`title` の「協調知能研究センター」を維持するかを決める。
3. Organization / Person の安定 ID と代表 URL を決める。
4. `zenodo-stats.html` の canonical / index 方針を決める。

### P1: トップ（最優先）

- 既存 JSON-LD を追加せず置換し、英日それぞれ一つの `@graph` に統合する。
- `WebSite`、`Organization`、各言語 `WebPage`、可視情報だけの Person を分離して `@id` 参照する。
- ResearchProject を残すなら、トップページと別ノードとし、可視名称・説明・研究対象が明確な活動だけに限定する。

### P2: 主宰者・ラボ紹介

- `members.html` と `jp/members.html` に `ProfilePage` を実装。
- `mainEntity` はページ上に明記された Takafumi Matsuoka / 松岡孝文。ORCID、GitHub、Zenodo 等はそのページまたは既存 HTML で確認できる URL だけを使う。
- AI メンバーを Person、共同著者、従業員として推測しない。

### P3: 徒然小論文

- まず 2〜3 英日ペアで Article テンプレートを試験。
- Rich Results Test と Schema Markup Validator の結果を確認後、38 ペアへ展開。
- H1、description、canonical、表示著者・日付をページごとに照合する。日付不明なら省略する。

### P4: 研究・プロジェクト

- 現在は独立ページがないため、一括実装しない。
- トップ内の BFSSU（Black Hole Fractal Steady-State Universe）/ DMF（Dynamic Mass Flow）等について、固有 URL と可視説明が成立する場合のみ `ResearchProject` を検討する。
- Zenodo DOI は可視リンクに存在するものだけを関連成果として参照し、`href="#"` の編集中項目は除外する。

### P5: BreadcrumbList

- Article、members、gallery、viewer に導入。ページ上のナビゲーションまたは実際のサイト階層と一致させる。
- URL 上に `/essays/` があるだけで、可視で存在しない「カテゴリページ」を架空の breadcrumb URL として作らない。必要なら Home > Current page の 2 階層に留める。

### P6: Viewer / 特殊ページ

- gallery は CollectionPage、viewer は WebPage + 明確な主画像だけ ImageObject。
- 日本語電磁波 viewer の言語不一致を解決するまで JSON-LD は保留。
- dashboard は canonical / index 方針の決定後に WebPage。集計表を Article や ResearchProject にしない。
- 3 リダイレクトには何も追加しない。

## 11. 実装時のリスク

- **虚偽・不可視情報**: author、日付、組織属性、画像情報をテンプレート既定値で埋めると Google ポリシー違反になり得る。
- **型の過剰適用**: 研究テーマというだけで ScholarlyArticle / ResearchProject にすると、ページ主内容と不一致になる。
- **名称衝突**: Co-Intelligence Lab / Thought Experiment Lab / 協調知能研究センターの混在を JSON-LD だけで隠すと、可視内容との不整合が増す。
- **重複エンティティ**: `@id` なしの Person / Organization をページごとに生成すると別主体として解釈され得る。反対に英日 WebPage の ID を共有すると別 URL・別言語を誤って同一化する。
- **翻訳関係の誤結合**: slug の単純置換では感情ページや `.htm` ページを誤る可能性がある。
- **canonical 不整合**: 空白を含む URL のエンコード差、dashboard の canonical 不在、redirect URL の誤採用。
- **リッチリザルト期待値**: Organization、Article、ProfilePage、Breadcrumb でも表示は保証されず、ResearchProject / CollectionPage / WebPage / ImageObject の多くは専用リッチリザルト目的ではない。
- **保守性**: 90 ファイルへ手作業で複製すると将来の Organization / Person 更新で差分が生じる。生成・監査スクリプトまたは CI 検査が望ましい。

## 12. 実装後の検証方法

1. 全 HTML の JSON をパースし、構文エラー、ブロック数、重複 `@id`、相対 URL を自動検査する。
2. canonical と JSON-LD `url` / `mainEntityOfPage.@id` が一致することを全件比較する。
3. Article の headline、description、author、date、image が可視本文・meta と一致することを差分表で確認する。
4. 英日マッピングの相互性、hreflang の自己参照・相互参照、言語別 `@id` の非共有を検査する。
5. [Google Rich Results Test](https://search.google.com/test/rich-results) で Article / ProfilePage / Organization / Breadcrumb の代表ページと本番 URL を検証する。
6. [Schema.org Validator](https://validator.schema.org/) で Google 専用対象外を含む全型とプロパティを検証する。
7. Google Search Console の URL 検査・拡張レポート、Bing Webmaster Tools の URL 検査でクロール後の認識を確認する。
8. デプロイ後に `curl` 等で本番 HTML を取得し、GitHub Pages が意図した canonical と JSON-LD を配信しているか確認する。
9. リダイレクト 3 ページに JSON-LD がないこと、`zenodo-stats.html` の決定した index 方針が守られることを回帰検査する。

## 13. 承認事項

実装開始前に、少なくとも次の承認が必要である。

1. 英日ラボ正式名称と alternateName の扱い
2. Person / Organization の代表 URL と `@id` 方針
3. 初回実装をトップ + members の 4 ファイルに限定すること
4. 徒然小論文を `Article` とし、`ScholarlyArticle` を使用しないこと
5. 独立プロジェクトページがない現状では ResearchProject を限定または保留すること
6. gallery / viewer / dashboard を低優先度とすること
7. リダイレクト 3 ページを対象外とすること

**本報告では実装を開始していない。承認後に、P0 の名称・識別子を確定してから P1 に進む。**
