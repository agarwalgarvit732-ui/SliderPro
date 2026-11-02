# SliderPro --- Pro Image Slider

A responsive, browser-based image slider that lets you preview,
organize, and present images with a clean interface. Try the live
version here:

**Live Demo:** https://sliderpro-lime.vercel.app/

## Features

-   **Drag-and-drop upload** --- add images from your device or browse
    for files.
-   **Multiple image formats** --- supports JPG, PNG, WEBP, GIF, and
    AVIF (up to 25 MB per image, as shown in the app).
-   **Sample gallery** --- load sample photos to try the slider.
-   **Slider navigation** --- move between images using the
    previous/next controls.
-   **Thumbnail strip** --- select an image from the thumbnails.
-   **Search** --- find slides by title.
-   **Autoplay** --- play or pause the slideshow.
-   **Fullscreen mode** --- view the active slide in fullscreen.
-   **Save, download, and delete controls** --- manage the active slide
    using the available controls.
-   **Light and dark appearance** --- switch the interface theme.
-   **Responsive interface** --- use the slider on desktop and smaller
    screens.
-   **Keyboard shortcuts** --- navigate and control the slideshow
    without relying only on the mouse.

## Keyboard Shortcuts

  Key        Action
  ---------- ----------------------------------
  `←`        Previous slide
  `→`        Next slide
  `Space`    Play / pause autoplay
  `F`        Toggle fullscreen
  `Home`     Go to the first slide
  `End`      Go to the last slide
  `Delete`   Delete the active slide
  `Esc`      Exit fullscreen or close a modal
  `/`        Focus the search bar

## Built With

-   **HTML5** --- page structure
-   **CSS3** --- layout, styling, and responsive interface
-   **JavaScript** --- slider behavior and user interactions
-   **Lucide** --- interface icons loaded through a CDN
-   **Unsplash** --- sample photos

## Project Structure

Keep these three files in the same project folder:

``` text
SliderPro/
├── index.html
├── index.css
├── index.js
└── README.md
```

## Run Locally

No build step is required for this static HTML/CSS/JavaScript project.

1.  Clone your repository:

    ``` bash
    git clone YOUR_GITHUB_REPOSITORY_URL
    ```

2.  Open the project folder.

3.  Open `index.html` in your browser.

For a more reliable local development experience, use a local server
extension such as **Live Server** in Visual Studio Code.

## Deploy on Vercel

This project can be deployed as a static site on Vercel.

1.  Push the project files to a GitHub repository.
2.  Sign in to [Vercel](https://vercel.com/) and choose **Add New →
    Project**.
3.  Import your GitHub repository.
4.  Choose **Other** as the framework preset if Vercel asks for one.
5.  Leave the build command empty because the project does not require a
    build step.
6.  Deploy the project.

**Live website:** https://sliderpro-lime.vercel.app/

## Notes

-   Images selected from your device are handled in the browser. This
    project does not, by itself, provide a server-side image storage
    service.
-   External sample images and CDN resources require an internet
    connection.
-   If you fork or reuse this project, check the applicable licenses and
    terms for any assets you add.

## Contributing

Suggestions and improvements are welcome. You can fork the repository,
make changes, and open a pull request.

## License

No license has been specified yet. Add a `LICENSE` file if you want to
publish the project under a particular open-source license.
