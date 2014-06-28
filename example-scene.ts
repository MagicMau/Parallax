var scene = new Parallax.Scene([
    {
        selector: "#intro",
        duration: 1,
        animations: [
            {
                selector: ".name",
                translateY: -150,
                opacity: 0
            },
            {
                selector: ".byline",
                opacity: 0
            },
            {
                selector: ".intro-explain i",
                translateY: 25,
            },
            {
                selector: ".intro-explain",
                startTime: 0.8,
                opacity: 0
            },
            {
                selector: "#bg-fields",
                initialOpacity: 0,
                startTime: 0.8,
                opacity: 1
            }
        ]
    },
    {
        selector: "#lesson1",
        duration: 1,
        animations: [
            {
                selector: ".name",
                initialOpacity: 0,
                opacity: 1,
                endTime: 0.6
            },
            {
                selector: ".name",
                translateY: 200,
                startTime: 0.6,
                opacity: 0,
                scale: 2
            }
        ]
    }
]);
