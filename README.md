# What is it?
- A full-stack web application in a monorepo
- TypeScript all the way... CDK for IaC, Angular front-end, AppSync & TypeScript lambda backends

# What can you do with it?
- Log in with Auth0
- Upload short videos and make boards out of them
- Favorite a board
- Caption the videos
- Delete videos and boards

# Areas that need improvement
- Testing
  - cdk
  - angular
  - lambda
  - synthetics
- Documentation (need to update REAMDEs)
- UI
  - Home page (logged in and logged out)
  - All/my boards list, need to paginate
  - Implement features on the features list

# Features

- [x] Authentication
	- [x] Auth0
- [ ] Profile
	- [ ] Auth0
- [ ] Settings
	- [ ] Global user settings
		- [ ] Colors
		- [ ] Font
		- [ ] 
- [ ] Users
- [x] Boards
	- [ ] Ordered list of videos
	- [ ] Fork/Remix
	- [x] Upload
		- [x] Drag and drop
		- [x] Button
		- [x] Video type and size limits
	- [ ] Playlists
		- [ ] sortable
		- [ ] Export to other sites
			- [ ] Bitchute
			- [ ] YouTube
	- [ ] Settings
		- [ ] Volume
		- [ ] Playback speed
- [x] Media
	- [x] mp4
	- [ ] gif
- [x] Favorites
	- [x] Board
- [ ] Search
	- [ ] Videos
	- [ ] Boards