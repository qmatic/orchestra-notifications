module.exports = function(grunt) {
	
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		
		concat: {
			dist: {
				src: [
					'public/js/*.js'
				],
				dest: 'public/js/build/visit.js'
			}
		},
		
		uglify: {
			build: {
				src: 'public/js/build/visit.js',
				dest: 'public/js/build/visit.min.js'
			}
		},
		
		imagemin: {
			dynamic: {
				files: [{
					expand: true,
					cwd: 'public/img/',
					src: ['*.{png,jpg,gif}'],
					dest: 'public/img/build/'
				}]
			}
		},
		
		cssmin: {
			combine: {
				files: {
					'public/css/build/visit.css': ['public/css/*.css']
				}
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-imagemin');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	
	grunt.registerTask('default', ['concat', 'uglify', 'imagemin', 'cssmin']);
};