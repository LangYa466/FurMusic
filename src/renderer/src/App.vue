<template>
  <div class="app" :style="appStyle">
    <!-- 自定义标题栏 -->
    <div class="title-bar">
      <div class="title-bar-drag"></div>
      <div class="window-controls">
        <button class="win-btn" @click="minimizeWindow">
          <Icon icon="mdi:minus" />
        </button>
        <button class="win-btn" @click="maximizeWindow">
          <Icon icon="mdi:checkbox-blank-outline" />
        </button>
        <button class="win-btn close-btn" @click="closeWindow">
          <Icon icon="mdi:close" />
        </button>
      </div>
    </div>
    <div class="blur-overlay"></div>

    <!-- 全屏歌词页面 -->
    <Transition name="lyrics-slide">
      <div v-if="showLyricsPage" class="lyrics-page" :style="lyricsBgStyle">
        <div class="lyrics-page-blur"></div>
        <button class="close-lyrics" @click="showLyricsPage = false">
          <Icon icon="mdi:chevron-down" />
        </button>
        <div class="lyrics-page-content" :style="lyricsPageSizeStyle">
          <div class="lyrics-left">
            <img
              :src="currentSong?.al?.picUrl"
              :class="[
                'lyrics-cover',
                { round: lyricsCoverRound, rotating: lyricsCoverRotate && isPlaying }
              ]"
            />
            <h2>{{ currentSong?.name }}</h2>
            <p class="lyrics-artist" @click="openArtistPage(currentSong?.ar?.[0])">
              {{ getArtists(currentSong) }}
            </p>
          </div>
          <div class="lyrics-right" :style="lyricsFontStyle">
            <div class="lyrics-scroll" :style="lyricsScrollStyle">
              <p
                ref="waitingLineRef"
                :class="['lyric-line', 'waiting', { active: currentLyricIndex === -1 }]"
              >
                ♪
              </p>
              <p
                v-for="(line, i) in parsedLyrics"
                :key="i"
                :ref="(el) => setLyricLineRef(el as HTMLElement, i)"
                :class="[
                  'lyric-line',
                  {
                    active: currentLyricIndex === i,
                    past: i < currentLyricIndex && currentLyricIndex !== -1
                  }
                ]"
                @click="seekToLyric(line.time)"
              >
                {{ line.text || '♪' }}
              </p>
            </div>
          </div>
        </div>
        <div class="lyrics-player-bar">
          <div class="lyrics-progress">
            <span>{{ formatTime(currentTime) }}</span>
            <div class="progress-track" @click="seekByClick">
              <div class="progress-fill" :style="progressFillStyle"></div>
              <div class="progress-thumb" :style="{ left: progressPercent + '%' }"></div>
            </div>
            <span>{{ formatTime(duration) }}</span>
          </div>
          <div class="lyrics-controls">
            <button
              class="like-btn"
              :class="{ liked: isLiked }"
              :style="isLiked ? { color: themeColor } : {}"
              :title="isLiked ? '取消喜欢' : '喜欢'"
              @click="toggleLike"
            >
              <Icon :icon="isLiked ? 'mdi:heart' : 'mdi:heart-outline'" />
            </button>
            <button @click="prevSong"><Icon icon="mdi:skip-previous" /></button>
            <button class="play-btn" @click="togglePlay">
              <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" />
            </button>
            <button @click="nextSong"><Icon icon="mdi:skip-next" /></button>
            <button
              class="mode-btn"
              :title="
                playMode === 'single'
                  ? '单曲循环'
                  : playMode === 'shuffle'
                    ? '随机播放'
                    : '列表循环'
              "
              @click="togglePlayMode"
            >
              <Icon
                :icon="
                  playMode === 'single'
                    ? 'mdi:repeat-once'
                    : playMode === 'shuffle'
                      ? 'mdi:shuffle'
                      : 'mdi:repeat'
                "
              />
            </button>
            <div class="volume-control">
              <Icon
                :icon="
                  volume === 0
                    ? 'mdi:volume-off'
                    : volume < 0.5
                      ? 'mdi:volume-medium'
                      : 'mdi:volume-high'
                "
              />
              <div class="volume-slider">
                <div class="volume-track">
                  <div
                    class="volume-fill"
                    :style="{ width: volume * 100 + '%', background: themeColor }"
                  ></div>
                  <input
                    v-model.number="volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    @input="setVolume"
                  />
                </div>
              </div>
            </div>
            <button class="queue-btn" title="播放列表" @click="showQueue = !showQueue">
              <Icon icon="mdi:playlist-music" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 设置页面 -->
    <Transition name="settings-slide">
      <div v-if="showSettings" class="settings-page">
        <div class="settings-header">
          <button class="back-btn" @click="showSettings = false">
            <Icon icon="mdi:arrow-left" />
          </button>
          <h2>设置</h2>
        </div>
        <div class="settings-content">
          <div class="settings-group">
            <h3>播放设置</h3>
            <div class="setting-row">
              <span>音质</span>
              <div class="custom-select" @click="toggleDropdown('quality')">
                <span>{{ qualityLabels[quality] }}</span>
                <Icon icon="mdi:chevron-down" :class="{ rotated: openDropdown === 'quality' }" />
                <Transition name="dropdown">
                  <div v-if="openDropdown === 'quality'" class="dropdown-menu">
                    <div
                      v-for="(label, key) in qualityLabels"
                      :key="key"
                      :class="['dropdown-item', { active: quality === key }]"
                      @click.stop="selectQuality(key)"
                    >
                      {{ label }}
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
          <div class="settings-group">
            <h3>系统设置</h3>
            <div class="setting-row">
              <span>开机自启动</span>
              <label class="toggle-switch">
                <input v-model="autoLaunch" type="checkbox" @change="toggleAutoLaunch" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="settings-group">
            <h3>代理设置</h3>
            <div class="setting-row">
              <span>启用代理</span>
              <label class="toggle-switch">
                <input v-model="proxyEnabled" type="checkbox" @change="toggleProxy" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div v-if="proxyEnabled" class="setting-row">
              <span>代理地址</span>
              <input
                v-model="proxyHost"
                class="proxy-input"
                placeholder="127.0.0.1"
                @change="updateProxy"
              />
            </div>
            <div v-if="proxyEnabled" class="setting-row">
              <span>代理端口</span>
              <input
                v-model="proxyPort"
                class="proxy-input"
                placeholder="7890"
                @change="updateProxy"
              />
            </div>
          </div>
          <div class="settings-group">
            <h3>主题设置</h3>
            <div class="setting-row">
              <span>主色调</span>
              <div class="color-picker">
                <div
                  v-for="color in themeColors"
                  :key="color"
                  :class="['color-option', { active: themeColor === color }]"
                  :style="{ background: color }"
                  @click="selectThemeColor(color)"
                ></div>
              </div>
            </div>
            <div class="setting-row">
              <span>背景模式</span>
              <div class="custom-select" @click="toggleDropdown('bgMode')">
                <span>{{ bgMode === 'album' ? '专辑封面' : '自定义图片' }}</span>
                <Icon icon="mdi:chevron-down" :class="{ rotated: openDropdown === 'bgMode' }" />
                <Transition name="dropdown">
                  <div v-if="openDropdown === 'bgMode'" class="dropdown-menu">
                    <div
                      :class="['dropdown-item', { active: bgMode === 'album' }]"
                      @click.stop="selectBgMode('album')"
                    >
                      专辑封面
                    </div>
                    <div
                      :class="['dropdown-item', { active: bgMode === 'custom' }]"
                      @click.stop="selectBgMode('custom')"
                    >
                      自定义图片
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
            <div v-if="bgMode === 'custom'" class="setting-row">
              <span>背景图片</span>
              <input v-model="customBgUrl" placeholder="本地路径或网络URL" @change="saveSettings" />
            </div>
          </div>
          <div class="settings-group">
            <h3>字体设置</h3>
            <div class="setting-row">
              <span>主字体</span>
              <div class="custom-select" @click="toggleDropdown('mainFont')">
                <span>{{ fontLabels[mainFont] }}</span>
                <Icon icon="mdi:chevron-down" :class="{ rotated: openDropdown === 'mainFont' }" />
                <Transition name="dropdown">
                  <div v-if="openDropdown === 'mainFont'" class="dropdown-menu">
                    <div
                      v-for="(label, key) in fontLabels"
                      :key="key"
                      :class="['dropdown-item', { active: mainFont === key }]"
                      @click.stop="selectMainFont(key)"
                    >
                      {{ label }}
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
            <div class="setting-row">
              <span>歌词字体</span>
              <div class="custom-select" @click="toggleDropdown('lyricsFont')">
                <span>{{ fontLabels[lyricsFont] }}</span>
                <Icon icon="mdi:chevron-down" :class="{ rotated: openDropdown === 'lyricsFont' }" />
                <Transition name="dropdown">
                  <div v-if="openDropdown === 'lyricsFont'" class="dropdown-menu">
                    <div
                      v-for="(label, key) in fontLabels"
                      :key="key"
                      :class="['dropdown-item', { active: lyricsFont === key }]"
                      @click.stop="selectLyricsFont(key)"
                    >
                      {{ label }}
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
          <div class="settings-group">
            <h3>歌词页面设置</h3>
            <div class="setting-row">
              <span>专辑封面大小</span>
              <div class="size-slider">
                <input
                  v-model.number="lyricsCoverSize"
                  type="range"
                  min="120"
                  max="280"
                  step="10"
                  @input="saveSettings"
                />
                <span class="size-value">{{ lyricsCoverSize }}px</span>
              </div>
            </div>
            <div class="setting-row">
              <span>歌曲信息大小</span>
              <div class="size-slider">
                <input
                  v-model.number="lyricsInfoSize"
                  type="range"
                  min="14"
                  max="28"
                  step="1"
                  @input="saveSettings"
                />
                <span class="size-value">{{ lyricsInfoSize }}px</span>
              </div>
            </div>
            <div class="setting-row">
              <span>歌词文字大小</span>
              <div class="size-slider">
                <input
                  v-model.number="lyricsTextSize"
                  type="range"
                  min="16"
                  max="36"
                  step="1"
                  @input="saveSettings"
                />
                <span class="size-value">{{ lyricsTextSize }}px</span>
              </div>
            </div>
            <div class="setting-row">
              <span>圆形封面</span>
              <label class="toggle-switch">
                <input v-model="lyricsCoverRound" type="checkbox" @change="saveSettings" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-row">
              <span>封面旋转</span>
              <label class="toggle-switch">
                <input v-model="lyricsCoverRotate" type="checkbox" @change="saveSettings" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 搜索页面 -->
    <Transition name="settings-slide">
      <div v-if="showSearch" class="search-page">
        <div class="settings-header">
          <button class="back-btn" @click="showSearch = false">
            <Icon icon="mdi:arrow-left" />
          </button>
          <div class="search-input-wrap">
            <Icon icon="mdi:magnify" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索歌曲、歌手..."
              @keyup.enter="doSearch"
            />
          </div>
        </div>
        <div class="settings-content">
          <div v-if="searchLoading" class="loading-tip">搜索中...</div>
          <div v-else-if="searchResults.length === 0 && searchQuery" class="loading-tip">
            无结果
          </div>
          <div v-else class="song-list">
            <div
              v-for="song in searchResults"
              :key="song.id"
              :class="['song-item', { playing: currentSong?.id === song.id }]"
              :style="currentSong?.id === song.id ? { background: themeColor + '40' } : {}"
              @click="playSearchSong(song)"
            >
              <img :src="song.al?.picUrl" class="song-cover" />
              <div class="song-info">
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">{{ getArtists(song) }}</span>
              </div>
              <span class="song-duration">{{ formatDuration(song.dt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 艺人页面 -->
    <Transition name="settings-slide">
      <div v-if="showArtist" class="artist-page">
        <div class="settings-header">
          <button class="back-btn" @click="showArtist = false">
            <Icon icon="mdi:arrow-left" />
          </button>
          <h2>{{ currentArtist?.name }}</h2>
        </div>
        <div class="artist-content">
          <div class="artist-header">
            <img :src="currentArtist?.picUrl || currentArtist?.img1v1Url" class="artist-avatar" />
            <div class="artist-info">
              <h1>{{ currentArtist?.name }}</h1>
              <p v-if="artistSongs.length">{{ artistSongs.length }} 首热门歌曲</p>
            </div>
          </div>
          <div v-if="artistLoading" class="loading-tip">加载中...</div>
          <div v-else class="song-list">
            <div
              v-for="(song, index) in artistSongs"
              :key="song.id"
              :class="['song-item', { playing: currentSong?.id === song.id }]"
              :style="currentSong?.id === song.id ? { background: themeColor + '40' } : {}"
              @click="playArtistSong(song, index)"
            >
              <span class="song-index">{{ index + 1 }}</span>
              <img :src="song.al?.picUrl" class="song-cover" />
              <div class="song-info">
                <span class="song-name">{{ song.name }}</span>
                <span class="song-artist">{{ getArtists(song) }}</span>
              </div>
              <span class="song-duration">{{ formatDuration(song.dt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 登录页面 -->
    <div v-if="!isLoggedIn" class="login-page">
      <div class="login-card">
        <h1>网易云音乐</h1>
        <p class="login-tip">
          登陆网页版网易云；打开网页的开发者工具 - 网络，只显示fetch/xhr；<br />
          点击每日歌曲推荐，在开发者工具那里找到songs?csrf_token那一条；<br />
          点击它，找到里面的：标头 - 请求标头 - cookie，全部复制，回到程序里粘贴，登陆。<br />
          <strong>仅Chromium内核浏览器可用该教程</strong>
        </p>
        <textarea v-model="cookieInput" placeholder="粘贴Cookie..."></textarea>
        <button :style="{ background: themeColor }" @click="login">登录</button>
      </div>
    </div>

    <!-- 主界面 -->
    <div
      v-else-if="!showLyricsPage && !showSettings && !showSearch && !showArtist"
      class="main-container"
    >
      <div class="sidebar">
        <div class="sidebar-logo">
          <h1><span class="logo-fur">Fur</span><span class="logo-music">Music</span></h1>
          <div class="sidebar-actions">
            <button class="icon-btn" title="搜索" @click="showSearch = true">
              <Icon icon="mdi:magnify" />
            </button>
            <button class="icon-btn" title="设置" @click="showSettings = true">
              <Icon icon="mdi:cog" />
            </button>
            <button class="icon-btn" title="退出" @click="logout">
              <Icon icon="mdi:logout" />
            </button>
          </div>
        </div>
        <div class="sidebar-header">
          <h2>我的歌单</h2>
          <div class="playlist-controls">
            <button
              class="control-btn"
              title="搜索歌单"
              @click="showPlaylistSearch = !showPlaylistSearch"
            >
              <Icon icon="mdi:magnify" />
            </button>
            <button class="control-btn" title="排序" @click="togglePlaylistSort">
              <Icon
                :icon="
                  playlistSortOrder === 'asc'
                    ? 'mdi:sort-alphabetical-ascending'
                    : 'mdi:sort-alphabetical-descending'
                "
              />
            </button>
          </div>
        </div>
        <div v-if="showPlaylistSearch" class="playlist-search">
          <input
            v-model="playlistSearchQuery"
            type="text"
            placeholder="搜索歌单..."
            class="playlist-search-input"
          />
        </div>
        <div class="playlist-list">
          <div
            v-for="playlist in filteredPlaylists"
            :key="playlist.id"
            :class="['playlist-item', { active: currentPlaylist?.id === playlist.id }]"
            @click="selectPlaylist(playlist)"
          >
            <img :src="playlist.coverImgUrl" alt="" />
            <span>{{ playlist.name }}</span>
          </div>
        </div>
      </div>
      <div class="content">
        <div v-if="currentPlaylist" class="playlist-header">
          <img :src="currentPlaylist.coverImgUrl" class="playlist-cover" />
          <div class="playlist-info">
            <h1>{{ currentPlaylist.name }}</h1>
            <p v-if="playlistLoading">加载中...</p>
            <p v-else>{{ filteredSongs.length }} 首歌曲</p>
            <button
              class="play-all-btn"
              :style="{ background: themeColor }"
              :disabled="playlistLoading || filteredSongs.length === 0"
              @click="playAll"
            >
              <Icon icon="mdi:play" /> 播放全部
            </button>
          </div>
        </div>
        <div v-if="currentPlaylist && !playlistLoading" class="song-controls">
          <div class="song-search">
            <Icon icon="mdi:magnify" />
            <input
              v-model="songSearchQuery"
              type="text"
              placeholder="搜索歌曲..."
              class="song-search-input"
            />
          </div>
          <div class="song-sort">
            <div class="custom-select" @click="toggleDropdown('songSort')">
              <span>{{ getSortLabel(songSortBy) }}</span>
              <Icon icon="mdi:chevron-down" :class="{ rotated: openDropdown === 'songSort' }" />
              <Transition name="dropdown">
                <div v-if="openDropdown === 'songSort'" class="dropdown-menu">
                  <div
                    :class="['dropdown-item', { active: songSortBy === 'default' }]"
                    @click.stop="selectSortBy('default')"
                  >
                    默认排序
                  </div>
                  <div
                    :class="['dropdown-item', { active: songSortBy === 'name' }]"
                    @click.stop="selectSortBy('name')"
                  >
                    按歌名
                  </div>
                  <div
                    :class="['dropdown-item', { active: songSortBy === 'artist' }]"
                    @click.stop="selectSortBy('artist')"
                  >
                    按歌手
                  </div>
                  <div
                    :class="['dropdown-item', { active: songSortBy === 'duration' }]"
                    @click.stop="selectSortBy('duration')"
                  >
                    按时长
                  </div>
                </div>
              </Transition>
            </div>
            <button class="sort-order-btn" @click="toggleSongSortOrder">
              <Icon
                :icon="songSortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending'"
              />
            </button>
          </div>
        </div>
        <div v-if="playlistLoading" class="loading-tip">加载中...</div>
        <div v-else class="song-list">
          <div
            v-for="(song, index) in filteredSongs"
            :key="song.id"
            :class="['song-item', { playing: currentSong?.id === song.id }]"
            :style="currentSong?.id === song.id ? { background: themeColor + '40' } : {}"
            @click="playSongFromFiltered(song)"
            @contextmenu.prevent="showSongContextMenu($event, song)"
          >
            <span class="song-index">{{ index + 1 }}</span>
            <img :src="song.al?.picUrl" class="song-cover" />
            <div class="song-info">
              <span class="song-name">{{ song.name }}</span>
              <span class="song-artist">{{ getArtists(song) }}</span>
            </div>
            <span class="song-duration">{{ formatDuration(song.dt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部播放器 -->
    <div v-if="isLoggedIn && !showLyricsPage && !showSettings" class="player-bar">
      <div v-if="currentSong" class="now-playing" @click="showLyricsPage = true">
        <img :src="currentSong.al?.picUrl" class="clickable-cover" />
        <div>
          <p class="song-title">{{ currentSong.name }}</p>
          <p class="song-artist">{{ getArtists(currentSong) }}</p>
        </div>
      </div>
      <button
        v-if="currentSong"
        class="like-btn"
        :class="{ liked: isLiked }"
        :style="isLiked ? { color: themeColor } : {}"
        :title="isLiked ? '取消喜欢' : '喜欢'"
        @click="toggleLike"
      >
        <Icon :icon="isLiked ? 'mdi:heart' : 'mdi:heart-outline'" />
      </button>
      <div class="player-controls">
        <button @click="prevSong"><Icon icon="mdi:skip-previous" /></button>
        <button class="play-btn" :style="{ background: themeColor }" @click="togglePlay">
          <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" />
        </button>
        <button @click="nextSong"><Icon icon="mdi:skip-next" /></button>
        <button
          class="mode-btn"
          :title="
            playMode === 'single' ? '单曲循环' : playMode === 'shuffle' ? '随机播放' : '列表循环'
          "
          @click="togglePlayMode"
        >
          <Icon
            :icon="
              playMode === 'single'
                ? 'mdi:repeat-once'
                : playMode === 'shuffle'
                  ? 'mdi:shuffle'
                  : 'mdi:repeat'
            "
          />
        </button>
      </div>
      <div class="player-progress">
        <span>{{ formatTime(currentTime) }}</span>
        <div class="progress-track" @click="seekByClick">
          <div class="progress-fill" :style="progressFillStyle"></div>
          <div
            class="progress-thumb"
            :style="{ left: progressPercent + '%', background: themeColor }"
          ></div>
        </div>
        <span>{{ formatTime(duration) }}</span>
      </div>
      <div class="volume-control">
        <Icon
          :icon="
            volume === 0 ? 'mdi:volume-off' : volume < 0.5 ? 'mdi:volume-medium' : 'mdi:volume-high'
          "
        />
        <div class="volume-slider">
          <div class="volume-track">
            <div
              class="volume-fill"
              :style="{ width: volume * 100 + '%', background: themeColor }"
            ></div>
            <input
              v-model.number="volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              @input="setVolume"
            />
          </div>
        </div>
      </div>
      <button class="queue-btn" title="播放列表" @click="showQueue = !showQueue">
        <Icon icon="mdi:playlist-music" />
      </button>
    </div>

    <!-- 播放列表面板 -->
    <Transition name="queue-slide">
      <div v-if="showQueue" class="queue-panel">
        <div class="queue-header">
          <h3>播放列表 ({{ songs.length }})</h3>
          <button class="queue-close" @click="showQueue = false">
            <Icon icon="mdi:close" />
          </button>
        </div>
        <div ref="queueListRef" class="queue-list">
          <div
            v-for="(song, index) in songs"
            :key="song.id"
            :ref="
              (el) => {
                if (currentSong?.id === song.id) currentQueueItemRef = el as HTMLElement
              }
            "
            :class="['queue-item', { playing: currentSong?.id === song.id }]"
            :style="currentSong?.id === song.id ? { background: themeColor + '30' } : {}"
            @click="playSong(song, index)"
          >
            <span class="queue-index">{{ index + 1 }}</span>
            <img :src="song.al?.picUrl" class="queue-cover" />
            <div class="queue-info">
              <span class="queue-name">{{ song.name }}</span>
              <span class="queue-artist">{{ getArtists(song) }}</span>
            </div>
            <span class="queue-duration">{{ formatDuration(song.dt) }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 更新提示弹窗 -->
    <Transition name="fade">
      <div
        v-if="showUpdateModal"
        class="update-modal-overlay"
        @click.self="showUpdateModal = false"
      >
        <div class="update-modal">
          <h3>发现新版本</h3>
          <p>
            新版本 <strong>{{ newVersion }}</strong> 已发布
          </p>
          <div class="update-modal-actions">
            <button class="update-btn-later" @click="showUpdateModal = false">稍后</button>
            <button class="update-btn-go" :style="{ background: themeColor }" @click="goToReleases">
              前往下载
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 右键菜单 -->
    <Transition name="fade">
      <div
        v-if="showContextMenu"
        class="context-menu-overlay"
        @click="hideContextMenu"
        @contextmenu.prevent="hideContextMenu"
      >
        <div class="context-menu" :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }">
          <div class="context-menu-item" @click.stop="removeSongFromPlaylist">
            <Icon icon="mdi:delete" />
            从歌单中删除
          </div>
        </div>
      </div>
    </Transition>

    <!-- 确认对话框 -->
    <Transition name="fade">
      <div v-if="showConfirmDialog" class="update-modal-overlay" @click.self="hideConfirmDialog">
        <div class="update-modal">
          <h3>{{ confirmDialog.title }}</h3>
          <p>{{ confirmDialog.message }}</p>
          <div class="update-modal-actions">
            <button class="update-btn-later" @click="hideConfirmDialog">取消</button>
            <button
              class="update-btn-go"
              :style="{ background: themeColor }"
              @click="confirmAction"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 消息提示 -->
    <Transition name="message-slide">
      <div v-if="showMessage" class="message-toast" :class="messageType">
        <Icon
          :icon="
            messageType === 'success'
              ? 'mdi:check-circle'
              : messageType === 'error'
                ? 'mdi:alert-circle'
                : 'mdi:information'
          "
        />
        <span>{{ messageText }}</span>
      </div>
    </Transition>

    <audio
      ref="audioRef"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @loadedmetadata="onLoaded"
      @error="onAudioError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import type { Song, Playlist, LyricLine, Artist, ArtistInfo } from './types'
import { qualityLabels, fontLabels, themeColors, defaultSettings } from './constants'
import { getArtists, formatDuration, formatTime } from './utils/format'
import './styles/index.css'

const isLoggedIn = ref(false)
const cookieInput = ref('')
const cookie = ref('')
const playlists = ref<Playlist[]>([])
const currentPlaylist = ref<Playlist | null>(null)
const songs = ref<Song[]>([])
const currentSong = ref<Song | null>(null)
const currentIndex = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
let audioErrorRetryCount = 0
let isSkippingFailedSong = false

// 日志工具函数
const logger = {
  info: (message: string, data?: unknown) => {
    console.log(message, data)
    window.api.writeLog('INFO', message, data)
  },
  error: (message: string, data?: unknown) => {
    console.error(message, data)
    window.api.writeLog('ERROR', message, data)
  },
  warn: (message: string, data?: unknown) => {
    console.warn(message, data)
    window.api.writeLog('WARN', message, data)
  },
  debug: (message: string, data?: unknown) => {
    console.log(message, data)
    window.api.writeLog('DEBUG', message, data)
  }
}
const volume = ref(defaultSettings.volume)
const playMode = ref<'single' | 'list' | 'shuffle'>('list')
const shuffledIndices = ref<number[]>([])
const parsedLyrics = ref<LyricLine[]>([])
const currentLyricIndex = ref(0)
const showLyricsPage = ref(false)
const waitingLineRef = ref<HTMLElement | null>(null)
const lyricLineRefs = ref<Map<number, HTMLElement>>(new Map())
const lyricsScrollY = ref(0)
const showSettings = ref(false)
const autoLaunch = ref(false)
const openDropdown = ref('')
const bgMode = ref<'album' | 'custom'>(defaultSettings.bgMode)
const customBgUrl = ref(defaultSettings.customBgUrl)
const quality = ref(defaultSettings.quality)
const mainFont = ref(defaultSettings.mainFont)
const lyricsFont = ref(defaultSettings.lyricsFont)
const themeColor = ref(defaultSettings.themeColor)
const lyricsCoverSize = ref(defaultSettings.lyricsCoverSize)
const lyricsInfoSize = ref(defaultSettings.lyricsInfoSize)
const lyricsTextSize = ref(defaultSettings.lyricsTextSize)
const lyricsCoverRound = ref(defaultSettings.lyricsCoverRound)
const lyricsCoverRotate = ref(defaultSettings.lyricsCoverRotate)
const proxyEnabled = ref(defaultSettings.proxyEnabled)
const proxyHost = ref(defaultSettings.proxyHost)
const proxyPort = ref(defaultSettings.proxyPort)

const showSearch = ref(false)
const searchQuery = ref('')
const searchResults = ref<Song[]>([])
const searchLoading = ref(false)

const showArtist = ref(false)
const showQueue = ref(false)
const queueListRef = ref<HTMLElement | null>(null)
const currentQueueItemRef = ref<HTMLElement | null>(null)
const showUpdateModal = ref(false)
const newVersion = ref('')
const currentArtist = ref<ArtistInfo | null>(null)
const artistSongs = ref<Song[]>([])
const artistLoading = ref(false)
const likedSongIds = ref<Set<number>>(new Set())
const isLiked = computed(() =>
  currentSong.value ? likedSongIds.value.has(currentSong.value.id) : false
)
const showPlaylistSearch = ref(false)
const playlistSearchQuery = ref('')
const playlistSortOrder = ref<'asc' | 'desc'>('asc')
const songSearchQuery = ref('')
const songSortBy = ref<'default' | 'name' | 'artist' | 'duration'>('default')
const songSortOrder = ref<'asc' | 'desc'>('asc')

// 歌单加载状态
const playlistLoading = ref(false)

// 右键菜单相关
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuSong = ref<Song | null>(null)

// 确认对话框相关
const showConfirmDialog = ref(false)
const confirmDialog = ref({
  title: '',
  message: '',
  action: null as (() => void) | null
})

// 消息提示相关
const showMessage = ref(false)
const messageText = ref('')
const messageType = ref<'success' | 'error' | 'info'>('info')

// 右键菜单功能
function showSongContextMenu(event: MouseEvent, song: Song): void {
  event.preventDefault()
  event.stopPropagation()
  contextMenuSong.value = song
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true

  // 确保右键后恢复正常的hover状态
  const target = event.currentTarget as HTMLElement
  if (target) {
    // 移除可能的focus状态
    target.blur()
    // 强制重新计算样式
    setTimeout(() => {
      target.style.pointerEvents = 'auto'
    }, 0)
  }
}

function hideContextMenu(): void {
  showContextMenu.value = false
  contextMenuSong.value = null

  // 确保所有song-item恢复正常的hover状态
  const songItems = document.querySelectorAll('.song-item')
  songItems.forEach((item) => {
    const element = item as HTMLElement
    element.style.pointerEvents = 'auto'
  })
}

function removeSongFromPlaylist(): void {
  if (!contextMenuSong.value || !currentPlaylist.value) return

  // 保存歌曲信息，因为 hideContextMenu 会清空 contextMenuSong
  const songToDelete = contextMenuSong.value
  const playlistToDeleteFrom = currentPlaylist.value

  hideContextMenu()

  confirmDialog.value = {
    title: '确认删除',
    message: `确定要从歌单中删除 "${songToDelete.name}" 吗？`,
    action: async () => {
      try {
        const response = await apiRequest('/playlist/track/delete', {
          id: playlistToDeleteFrom.id,
          ids: songToDelete.id.toString()
        })

        // 检查API响应
        if (response.code === 200) {
          // 从本地列表中移除歌曲
          const songIndex = songs.value.findIndex((s) => s.id === songToDelete.id)
          if (songIndex !== -1) {
            songs.value.splice(songIndex, 1)

            // 如果删除的是当前播放的歌曲，停止播放
            if (currentSong.value?.id === songToDelete.id) {
              if (audioRef.value) {
                audioRef.value.pause()
                audioRef.value.src = ''
              }
              currentSong.value = null
              isPlaying.value = false
            }

            // 如果删除的歌曲在当前播放索引之前，需要调整索引
            if (songIndex < currentIndex.value) {
              currentIndex.value--
            }
          }

          // 显示成功消息，优先使用msg字段
          const message =
            (response.msg as string) || (response.message as string) || '歌曲已从歌单中删除'
          showMessageToast(message, 'success')
        } else {
          // 显示错误消息，优先使用msg字段
          const message = (response.msg as string) || (response.message as string) || '删除歌曲失败'
          showMessageToast(message, 'error')
        }
      } catch (error) {
        console.error('删除歌曲失败:', error)
        showMessageToast('删除歌曲失败，请重试', 'error')
      }

      hideConfirmDialog()
    }
  }

  showConfirmDialog.value = true
}

function hideConfirmDialog(): void {
  showConfirmDialog.value = false
  confirmDialog.value = {
    title: '',
    message: '',
    action: null
  }
}

function confirmAction(): void {
  if (confirmDialog.value.action) {
    confirmDialog.value.action()
  }
}

// 消息提示函数
function showMessageToast(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
  messageText.value = text
  messageType.value = type
  showMessage.value = true

  // 3秒后自动隐藏
  setTimeout(() => {
    showMessage.value = false
  }, 3000)
}

const filteredPlaylists = computed(() => {
  let filtered = playlists.value

  // 搜索过滤
  if (playlistSearchQuery.value.trim()) {
    const query = playlistSearchQuery.value.toLowerCase()
    filtered = filtered.filter((playlist) => playlist.name.toLowerCase().includes(query))
  }

  // 排序
  return filtered.sort((a, b) => {
    const comparison = a.name.localeCompare(b.name, 'zh-CN')
    return playlistSortOrder.value === 'asc' ? comparison : -comparison
  })
})

const filteredSongs = computed(() => {
  let filtered = songs.value

  // 搜索过滤
  if (songSearchQuery.value.trim()) {
    const query = songSearchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (song) =>
        song.name.toLowerCase().includes(query) || getArtists(song).toLowerCase().includes(query)
    )
  }

  // 排序
  if (songSortBy.value !== 'default') {
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (songSortBy.value) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN')
          break
        case 'artist':
          comparison = getArtists(a).localeCompare(getArtists(b), 'zh-CN')
          break
        case 'duration':
          comparison = a.dt - b.dt
          break
      }

      return songSortOrder.value === 'asc' ? comparison : -comparison
    })
  }

  return filtered
})

const progressPercent = computed(() =>
  duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
)

const progressFillStyle = computed(() => ({
  width: progressPercent.value + '%',
  background: `linear-gradient(90deg, ${themeColor.value}, ${themeColor.value}dd)`
}))

const appStyle = computed(() => {
  let bgUrl = ''
  if (bgMode.value === 'album' && currentSong.value?.al?.picUrl) {
    bgUrl = currentSong.value.al.picUrl
  } else if (bgMode.value === 'custom' && customBgUrl.value) {
    bgUrl = customBgUrl.value
  }
  const ff =
    mainFont.value === 'system'
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      : `'${mainFont.value}', sans-serif`
  return {
    '--bg-image': bgUrl ? `url(${bgUrl})` : 'none',
    '--main-font': ff,
    '--theme-color': themeColor.value
  }
})

const lyricsBgStyle = computed(() => ({
  '--lyrics-bg': currentSong.value?.al?.picUrl ? `url(${currentSong.value.al.picUrl})` : 'none'
}))

const lyricsFontStyle = computed(() => ({
  fontFamily:
    lyricsFont.value === 'system'
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      : `'${lyricsFont.value}', sans-serif`
}))

const lyricsScrollStyle = computed(() => ({
  transform: `translateY(${-lyricsScrollY.value}px)`
}))

// 设置歌词行的 ref
function setLyricLineRef(el: HTMLElement | null, index: number): void {
  if (el) {
    lyricLineRefs.value.set(index, el)
  } else {
    lyricLineRefs.value.delete(index)
  }
}

// 计算歌词滚动位置（基于实际元素高度）
function updateLyricsScrollPosition(): void {
  let totalHeight = 0

  // 加上等待行（♪）的高度
  if (waitingLineRef.value) {
    totalHeight += waitingLineRef.value.offsetHeight
  }

  // 累加当前歌词之前所有行的实际高度
  for (let i = 0; i < currentLyricIndex.value; i++) {
    const el = lyricLineRefs.value.get(i)
    if (el) {
      totalHeight += el.offsetHeight
    }
  }

  // 加上当前行高度的一半，使当前行居中
  if (currentLyricIndex.value >= 0) {
    const currentEl = lyricLineRefs.value.get(currentLyricIndex.value)
    if (currentEl) {
      totalHeight += currentEl.offsetHeight / 2
    }
  } else if (waitingLineRef.value) {
    // 如果是等待状态，居中等待行
    totalHeight = waitingLineRef.value.offsetHeight / 2
  }

  lyricsScrollY.value = totalHeight
}

const lyricsPageSizeStyle = computed(() => ({
  '--cover-size': `${lyricsCoverSize.value}px`,
  '--info-size': `${lyricsInfoSize.value}px`,
  '--text-size': `${lyricsTextSize.value}px`,
  '--text-size-active': `${lyricsTextSize.value + 4}px`,
  '--line-height': `${lyricsTextSize.value + 34}px`
}))

// 窗口控制
function minimizeWindow(): void {
  window.api.minimize()
}
function maximizeWindow(): void {
  window.api.maximize()
}
function closeWindow(): void {
  window.api.close()
}
function goToReleases(): void {
  window.api.openReleases()
  showUpdateModal.value = false
}

function toggleDropdown(name: string): void {
  openDropdown.value = openDropdown.value === name ? '' : name
}

function selectQuality(key: string): void {
  quality.value = key
  saveSettings()
  openDropdown.value = ''
}

function selectSortBy(key: 'default' | 'name' | 'artist' | 'duration'): void {
  songSortBy.value = key
  openDropdown.value = ''
  saveSettings()
}

function getSortLabel(sortBy: string): string {
  const labels = {
    default: '默认排序',
    name: '按歌名',
    artist: '按歌手',
    duration: '按时长'
  }
  return labels[sortBy as keyof typeof labels] || '默认排序'
}

async function toggleAutoLaunch(): Promise<void> {
  autoLaunch.value = await window.api.setAutoLaunch(autoLaunch.value)
}

async function loadAutoLaunchSetting(): Promise<void> {
  autoLaunch.value = await window.api.getAutoLaunch()
}

function toggleProxy(): void {
  saveSettings()
  if (proxyEnabled.value && proxyHost.value && proxyPort.value) {
    window.api.setProxy(`http://${proxyHost.value}:${proxyPort.value}`)
  } else {
    window.api.setProxy(null)
  }
}

function updateProxy(): void {
  saveSettings()
  if (proxyEnabled.value && proxyHost.value && proxyPort.value) {
    window.api.setProxy(`http://${proxyHost.value}:${proxyPort.value}`)
  }
}

function selectBgMode(mode: 'album' | 'custom'): void {
  bgMode.value = mode
  saveSettings()
  openDropdown.value = ''
}

function selectMainFont(key: string): void {
  mainFont.value = key
  saveSettings()
  openDropdown.value = ''
}

function selectLyricsFont(key: string): void {
  lyricsFont.value = key
  saveSettings()
  openDropdown.value = ''
}

function selectThemeColor(color: string): void {
  themeColor.value = color
  saveSettings()
}

function saveSettings(): void {
  window.api.storeSet('settings', {
    bgMode: bgMode.value,
    customBgUrl: customBgUrl.value,
    quality: quality.value,
    mainFont: mainFont.value,
    lyricsFont: lyricsFont.value,
    themeColor: themeColor.value,
    lyricsCoverSize: lyricsCoverSize.value,
    lyricsInfoSize: lyricsInfoSize.value,
    lyricsTextSize: lyricsTextSize.value,
    lyricsCoverRound: lyricsCoverRound.value,
    lyricsCoverRotate: lyricsCoverRotate.value,
    volume: volume.value,
    proxyEnabled: proxyEnabled.value,
    proxyHost: proxyHost.value,
    proxyPort: proxyPort.value,
    playlistSortOrder: playlistSortOrder.value,
    songSortBy: songSortBy.value,
    songSortOrder: songSortOrder.value,
    playMode: playMode.value
  })
}

function saveLastPlaying(): void {
  if (currentSong.value && currentPlaylist.value) {
    window.api.storeSet('last_playing', {
      songId: currentSong.value.id,
      playlistId: currentPlaylist.value.id,
      currentTime: currentTime.value
    })
  }
}

async function loadSettings(): Promise<void> {
  const saved = (await window.api.storeGet('settings')) as Record<string, unknown> | null
  if (saved) {
    bgMode.value = (saved.bgMode as 'album' | 'custom') || defaultSettings.bgMode
    customBgUrl.value = (saved.customBgUrl as string) || defaultSettings.customBgUrl
    quality.value = (saved.quality as string) || defaultSettings.quality
    mainFont.value = (saved.mainFont as string) || defaultSettings.mainFont
    lyricsFont.value = (saved.lyricsFont as string) || defaultSettings.lyricsFont
    themeColor.value = (saved.themeColor as string) || defaultSettings.themeColor
    lyricsCoverSize.value = (saved.lyricsCoverSize as number) || defaultSettings.lyricsCoverSize
    lyricsInfoSize.value = (saved.lyricsInfoSize as number) || defaultSettings.lyricsInfoSize
    lyricsTextSize.value = (saved.lyricsTextSize as number) || defaultSettings.lyricsTextSize
    lyricsCoverRound.value = (saved.lyricsCoverRound as boolean) ?? defaultSettings.lyricsCoverRound
    lyricsCoverRotate.value =
      (saved.lyricsCoverRotate as boolean) ?? defaultSettings.lyricsCoverRotate
    volume.value = (saved.volume as number) ?? defaultSettings.volume
    proxyEnabled.value = (saved.proxyEnabled as boolean) ?? defaultSettings.proxyEnabled
    proxyHost.value = (saved.proxyHost as string) || defaultSettings.proxyHost
    proxyPort.value = (saved.proxyPort as string) || defaultSettings.proxyPort
    playlistSortOrder.value = (saved.playlistSortOrder as 'asc' | 'desc') || 'asc'
    songSortBy.value = (saved.songSortBy as 'default' | 'name' | 'artist' | 'duration') || 'default'
    songSortOrder.value = (saved.songSortOrder as 'asc' | 'desc') || 'asc'
    playMode.value = (saved.playMode as 'single' | 'list' | 'shuffle') || 'list'
  }
}

async function login(): Promise<void> {
  if (!cookieInput.value.trim()) return
  cookie.value = cookieInput.value.trim()
  await window.api.storeSet('cookie', cookie.value)
  await loadPlaylists()
  isLoggedIn.value = true
}

function logout(): void {
  window.api.storeSet('cookie', '')
  cookie.value = ''
  cookieInput.value = ''
  isLoggedIn.value = false
  playlists.value = []
  currentPlaylist.value = null
  songs.value = []
  currentSong.value = null
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.src = ''
  }
  isPlaying.value = false
}

async function apiRequest(
  path: string,
  params: Record<string, string | number> = {},
  retries = 3
): Promise<Record<string, unknown>> {
  const query = new URLSearchParams()
  query.set('cookie', cookie.value)
  for (const [key, val] of Object.entries(params)) {
    query.set(key, String(val))
  }
  const url = `http://localhost:3000${path}?${query.toString()}`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url)
      // 不管HTTP状态码如何，都尝试解析JSON响应
      const data = await response.json()

      // 如果响应不是200但有有效的JSON，直接返回数据
      // 让调用方根据data.code来判断成功或失败
      if (!response.ok && !data.code) {
        throw new Error(`HTTP ${response.status}`)
      }

      return data
    } catch (error) {
      console.error(`API request failed (attempt ${attempt}/${retries}):`, path, error)
      if (attempt === retries) {
        throw error
      }
      // 等待后重试，每次等待时间递增
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
  return {}
}

async function loadPlaylists(): Promise<void> {
  const userRes = await apiRequest('/user/account')
  const profile = userRes.profile as { userId: number } | undefined
  if (profile) {
    const res = await apiRequest('/user/playlist', { uid: profile.userId })
    playlists.value = (res.playlist as Playlist[]) || []
    if (playlists.value.length > 0) await selectPlaylist(playlists.value[0])
    // 加载喜欢的歌曲列表
    await loadLikedSongs()
  }
}

async function loadLikedSongs(): Promise<void> {
  try {
    const res = await apiRequest('/likelist')
    const ids = res.ids as number[] | undefined
    if (ids) {
      likedSongIds.value = new Set(ids)
    }
  } catch {
    console.error('Failed to load liked songs')
  }
}

async function toggleLike(): Promise<void> {
  if (!currentSong.value) return
  const songId = currentSong.value.id
  const like = !isLiked.value
  try {
    await apiRequest('/like', { id: songId, like: like ? 'true' : 'false' })
    if (like) {
      likedSongIds.value.add(songId)
    } else {
      likedSongIds.value.delete(songId)
    }
    // 触发响应式更新
    likedSongIds.value = new Set(likedSongIds.value)
  } catch {
    console.error('Failed to toggle like')
  }
}

function togglePlaylistSort(): void {
  playlistSortOrder.value = playlistSortOrder.value === 'asc' ? 'desc' : 'asc'
  saveSettings()
}

function toggleSongSortOrder(): void {
  songSortOrder.value = songSortOrder.value === 'asc' ? 'desc' : 'asc'
  saveSettings()
}

async function playSongFromFiltered(song: Song): Promise<void> {
  // 找到歌曲在原始列表中的索引
  const originalIndex = songs.value.findIndex((s) => s.id === song.id)
  if (originalIndex !== -1) {
    await playSong(song, originalIndex)
  }
}

async function selectPlaylist(playlist: Playlist): Promise<void> {
  currentPlaylist.value = playlist
  playlistLoading.value = true

  // 立即清空歌曲列表，避免显示上一个歌单的内容
  songs.value = []

  try {
    const res = await apiRequest('/playlist/track/all', { id: playlist.id })
    songs.value = (res.songs as Song[]) || []
  } catch (error) {
    console.error('Failed to load playlist:', error)
    songs.value = []
  } finally {
    playlistLoading.value = false
  }

  // 重置歌曲搜索状态，但保持排序偏好
  songSearchQuery.value = ''
}

async function doSearch(): Promise<void> {
  if (!searchQuery.value.trim()) return
  searchLoading.value = true
  try {
    const res = await apiRequest('/cloudsearch', {
      keywords: searchQuery.value,
      type: 1,
      limit: 50
    })
    const result = res.result as { songs?: Song[] } | undefined
    searchResults.value = result?.songs || []
  } catch {
    searchResults.value = []
  }
  searchLoading.value = false
}

async function playSearchSong(song: Song): Promise<void> {
  songs.value = searchResults.value
  const index = searchResults.value.findIndex((s) => s.id === song.id)
  await playSong(song, index >= 0 ? index : 0)
}

async function openArtistPage(artist: Artist | undefined): Promise<void> {
  if (!artist?.id) return
  showLyricsPage.value = false
  // 先用当前歌曲封面作为临时图片
  currentArtist.value = {
    id: artist.id,
    name: artist.name,
    picUrl: currentSong.value?.al?.picUrl,
    img1v1Url: currentSong.value?.al?.picUrl
  }
  showArtist.value = true
  artistLoading.value = true
  try {
    const detailRes = await apiRequest('/artist/detail', { id: artist.id })
    const data = detailRes.data as { artist?: ArtistInfo } | undefined
    const artistData = data?.artist
    if (artistData) {
      currentArtist.value = {
        id: artist.id,
        name: artistData.name || artist.name,
        picUrl:
          artistData.cover ||
          artistData.picUrl ||
          artistData.img1v1Url ||
          currentSong.value?.al?.picUrl,
        img1v1Url: artistData.img1v1Url || artistData.picUrl || artistData.cover
      }
    }
    const songsRes = await apiRequest('/artist/top/song', { id: artist.id })
    artistSongs.value = (songsRes.songs as Song[]) || []
  } catch {
    artistSongs.value = []
  }
  artistLoading.value = false
}

async function playArtistSong(song: Song, index: number): Promise<void> {
  songs.value = artistSongs.value
  await playSong(song, index)
}

async function playSong(
  song: Song,
  index: number,
  seekTime?: number,
  autoPlay = true
): Promise<void> {
  logger.debug('playSong called', {
    songName: song?.name,
    index,
    songExists: !!song,
    songId: song?.id
  })
  if (!song || !song.id) {
    logger.warn('playSong: song is invalid, returning')
    return
  }

  currentSong.value = song
  currentIndex.value = index
  currentLyricIndex.value = -1
  audioErrorRetryCount = 0

  try {
    const urlRes = await apiRequest('/song/url/v1', { id: song.id, level: quality.value })
    const data = urlRes.data as { url: string }[] | undefined
    if (data?.[0]?.url && audioRef.value) {
      audioRef.value.src = data[0].url
      audioRef.value.volume = volume.value
      if (seekTime !== undefined) {
        audioRef.value.currentTime = seekTime
      }
      if (autoPlay) {
        audioRef.value.play()
        isPlaying.value = true
      } else {
        isPlaying.value = false
      }
    } else {
      // 没有获取到播放地址，自动跳下一首
      console.warn('No playable URL for song:', song.name)
      if (autoPlay && songs.value.length > 1) {
        setTimeout(() => nextSong(), 500)
        return
      }
    }
  } catch (error) {
    console.error('Failed to get song URL:', error)
    // 请求失败，自动跳下一首
    if (autoPlay && songs.value.length > 1) {
      setTimeout(() => nextSong(), 500)
      return
    }
  }

  // 获取歌词（失败不影响播放）
  try {
    const lrcRes = await apiRequest('/lyric', { id: song.id })
    const lrc = (lrcRes.lrc as { lyric: string } | undefined)?.lyric || ''
    parsedLyrics.value = lrc
      .split('\n')
      .map((line) => {
        const m = line.match(/\[(\d+):(\d+)\.(\d+)\](.*)/)
        if (!m) return null
        const min = parseInt(m[1])
        const sec = parseInt(m[2])
        const msStr = m[3].padEnd(3, '0')
        const ms = parseInt(msStr)
        return { time: min * 60 + sec + ms / 1000, text: m[4].trim() || '♪' }
      })
      .filter((x): x is LyricLine => x !== null)
  } catch {
    parsedLyrics.value = []
  }
  saveLastPlaying()
}

function playAll(): void {
  if (songs.value.length === 0) return
  if (playMode.value === 'shuffle') {
    shuffledIndices.value = [...Array(songs.value.length).keys()].sort(() => Math.random() - 0.5)
    playSong(songs.value[shuffledIndices.value[0]], shuffledIndices.value[0])
  } else {
    playSong(songs.value[0], 0)
  }
}

function togglePlay(): void {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play()
  }
  isPlaying.value = !isPlaying.value
}

function prevSong(): void {
  if (songs.value.length === 0) return

  let i: number
  if (playMode.value === 'shuffle') {
    if (shuffledIndices.value.length === 0) {
      // 如果 shuffle 列表为空，重新生成
      shuffledIndices.value = [...Array(songs.value.length).keys()].sort(() => Math.random() - 0.5)
    }
    const currentPos = shuffledIndices.value.indexOf(currentIndex.value)
    if (currentPos === -1) {
      // 如果当前索引不在 shuffle 列表中，使用最后一个
      i = shuffledIndices.value[shuffledIndices.value.length - 1]
    } else {
      i =
        shuffledIndices.value[
          (currentPos - 1 + shuffledIndices.value.length) % shuffledIndices.value.length
        ]
    }
  } else {
    i = (currentIndex.value - 1 + songs.value.length) % songs.value.length
  }

  playSong(songs.value[i], i)
}

function nextSong(): void {
  logger.debug('nextSong called', {
    songsLength: songs.value.length,
    currentIndex: currentIndex.value,
    playMode: playMode.value
  })
  if (songs.value.length === 0) return

  let i: number
  if (playMode.value === 'shuffle') {
    logger.debug('shuffle mode', { shuffledIndicesLength: shuffledIndices.value.length })
    if (shuffledIndices.value.length === 0) {
      // 如果 shuffle 列表为空，重新生成
      shuffledIndices.value = [...Array(songs.value.length).keys()].sort(() => Math.random() - 0.5)
      logger.debug('generated new shuffledIndices', { length: shuffledIndices.value.length })
    }
    const currentPos = shuffledIndices.value.indexOf(currentIndex.value)
    if (currentPos === -1) {
      // 如果当前索引不在 shuffle 列表中，使用第一个
      i = shuffledIndices.value[0]
    } else {
      i = shuffledIndices.value[(currentPos + 1) % shuffledIndices.value.length]
    }
  } else {
    logger.debug('normal mode, calculating next index')
    i = (currentIndex.value + 1) % songs.value.length
    logger.debug('calculated index', { index: i })
  }

  logger.debug('nextSong: final result', {
    index: i,
    songExists: !!songs.value[i],
    songName: songs.value[i]?.name
  })
  playSong(songs.value[i], i)
}

let lastSaveTime = 0
function onTimeUpdate(): void {
  if (!audioRef.value) return
  currentTime.value = audioRef.value.currentTime
  if (currentTime.value - lastSaveTime > 5) {
    lastSaveTime = currentTime.value
    saveLastPlaying()
  }
  if (parsedLyrics.value.length === 0 || currentTime.value < parsedLyrics.value[0].time) {
    currentLyricIndex.value = -1
    return
  }
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (currentTime.value >= parsedLyrics.value[i].time) {
      currentLyricIndex.value = i
      break
    }
  }
}

function onLoaded(): void {
  if (audioRef.value) duration.value = audioRef.value.duration
}

function onEnded(): void {
  if (playMode.value === 'single') {
    // 单曲循环：重新播放当前歌曲
    if (audioRef.value) {
      audioRef.value.currentTime = 0
      audioRef.value.play()
    }
  } else {
    nextSong()
  }
}

async function onAudioError(): Promise<void> {
  if (!audioRef.value || !currentSong.value) return

  const error = audioRef.value.error
  if (!error) return

  let errorMsg = '音乐加载失败'
  switch (error.code) {
    case error.MEDIA_ERR_ABORTED:
      errorMsg = '音乐加载被中止'
      break
    case error.MEDIA_ERR_NETWORK:
      errorMsg = '网络错误，无法加载音乐'
      break
    case error.MEDIA_ERR_DECODE:
      errorMsg = '音乐格式错误或损坏'
      break
    case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
      errorMsg = '不支持的音乐格式'
      break
  }

  console.error('Audio error:', errorMsg, error)
  logger.error('Audio error occurred', {
    errorMsg,
    errorCode: error.code,
    songName: currentSong.value?.name,
    retryCount: audioErrorRetryCount
  })

  // 如果正在跳过失败的歌曲，不再处理错误
  if (isSkippingFailedSong) return

  // 重试逻辑
  if (audioErrorRetryCount < 3) {
    audioErrorRetryCount++
    showMessageToast(`${errorMsg}，正在重试 (${audioErrorRetryCount}/3)...`, 'error')

    try {
      // 等待一秒后重试
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (!currentSong.value) return

      const urlRes = await apiRequest('/song/url/v1', {
        id: currentSong.value.id,
        level: quality.value
      })
      const data = urlRes.data as { url: string }[] | undefined
      if (data?.[0]?.url && audioRef.value) {
        audioRef.value.src = data[0].url
        audioRef.value.play()
        isPlaying.value = true
        audioErrorRetryCount = 0
        showMessageToast('重新加载成功', 'success')
      } else {
        // 继续重试
        if (audioErrorRetryCount < 3) {
          showMessageToast(`无法获取播放地址，正在重试 (${audioErrorRetryCount}/3)...`, 'error')
        }
      }
    } catch (err) {
      console.error('Failed to retry song URL:', err)
      // 继续重试
      if (audioErrorRetryCount < 3) {
        showMessageToast(`重新获取失败，正在重试 (${audioErrorRetryCount}/3)...`, 'error')
      }
    }
  } else {
    // 重试3次都失败，跳到下一首歌
    audioErrorRetryCount = 0
    showMessageToast('无法加载此歌曲，已跳到下一首', 'error')
    if (songs.value.length > 1) {
      isSkippingFailedSong = true
      setTimeout(() => {
        nextSong()
        isSkippingFailedSong = false
      }, 500)
    }
  }
}

function togglePlayMode(): void {
  const modes: Array<'single' | 'list' | 'shuffle'> = ['list', 'single', 'shuffle']
  const currentIdx = modes.indexOf(playMode.value)
  playMode.value = modes[(currentIdx + 1) % modes.length]
  saveSettings()
}

function seekByClick(e: MouseEvent): void {
  const t = e.currentTarget as HTMLElement
  const p = (e.clientX - t.getBoundingClientRect().left) / t.offsetWidth
  if (audioRef.value && duration.value > 0) {
    audioRef.value.currentTime = currentTime.value = p * duration.value
  }
}

function seekToLyric(time: number): void {
  if (audioRef.value) {
    audioRef.value.currentTime = currentTime.value = time
  }
}

function setVolume(): void {
  if (audioRef.value) audioRef.value.volume = volume.value
  saveSettings()
}

onMounted(async () => {
  await loadSettings()
  loadAutoLaunchSetting()
  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }

  // 监听更新提示
  window.api.onUpdateAvailable((version) => {
    newVersion.value = version
    showUpdateModal.value = true
  })

  const saved = (await window.api.storeGet('cookie')) as string | null
  if (saved) {
    cookie.value = saved
    cookieInput.value = saved
    await loadPlaylists()
    isLoggedIn.value = true
    const lastPlaying = (await window.api.storeGet('last_playing')) as {
      songId: number
      playlistId: number
      currentTime: number
    } | null
    if (lastPlaying) {
      const { songId, playlistId, currentTime: savedTime } = lastPlaying
      const playlist = playlists.value.find((p) => p.id === playlistId)
      if (playlist) {
        await selectPlaylist(playlist)
        const songIndex = songs.value.findIndex((s) => s.id === songId)
        if (songIndex !== -1) {
          await playSong(songs.value[songIndex], songIndex, savedTime, false)
        }
      }
    }
  }
})

watch(playMode, () => {
  if (playMode.value === 'shuffle') {
    shuffledIndices.value = [...Array(songs.value.length).keys()].sort(() => Math.random() - 0.5)
  }
})

watch(showQueue, (val) => {
  if (val) {
    setTimeout(() => {
      if (currentQueueItemRef.value && queueListRef.value) {
        currentQueueItemRef.value.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 50)
  }
})

// 监听歌词索引变化，更新滚动位置
watch(currentLyricIndex, () => {
  // 使用 nextTick 确保 DOM 已更新
  setTimeout(() => {
    updateLyricsScrollPosition()
  }, 0)
})

// 监听歌词页面显示，初始化滚动位置
watch(showLyricsPage, (val) => {
  if (val) {
    setTimeout(() => {
      updateLyricsScrollPosition()
    }, 100)
  }
})

// 监听点击事件，隐藏右键菜单
watch(showContextMenu, (val) => {
  if (val) {
    // 添加全局点击监听器
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.context-menu')) {
        hideContextMenu()
        document.removeEventListener('click', handleClickOutside)
      }
    }
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
  }
})
</script>
